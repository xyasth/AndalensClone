import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Cache to avoid repeated searches
const fileIdCache = new Map<string, string>();

async function findFileInDriveFolder(
  folderId: string,
  fileName: string,
  accessToken: string
): Promise<string | null> {
  try {
    // Check cache first
    const cacheKey = `${folderId}:${fileName}`;
    if (fileIdCache.has(cacheKey)) {
      console.log('📋 Using cached file ID for:', fileName);
      return fileIdCache.get(cacheKey)!;
    }

    console.log('🔍 Searching Drive for file:', fileName, 'in folder:', folderId);

    // Search for the file by name in the folder
    const searchQuery = `name='${fileName}' and '${folderId}' in parents`;
    
    const searchResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(searchQuery)}&fields=files(id,name,parents)`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!searchResponse.ok) {
      console.error('❌ Drive search failed:', searchResponse.status);
      return null;
    }

    const searchData = await searchResponse.json();
    
    if (searchData.files && searchData.files.length > 0) {
      const actualFileId = searchData.files[0].id;
      console.log('✅ Found file in Drive:', fileName, '->', actualFileId);
      
      // Cache the result
      fileIdCache.set(cacheKey, actualFileId);
      return actualFileId;
    }

    // If not found in direct children, search recursively in subfolders
    console.log('🔍 File not in main folder, searching subfolders...');
    const actualFileId = await searchInSubfolders(folderId, fileName, accessToken);
    
    if (actualFileId) {
      fileIdCache.set(cacheKey, actualFileId);
      return actualFileId;
    }

    console.log('❌ File not found anywhere:', fileName);
    return null;
  } catch (error) {
    console.error('❌ Error searching for file:', error);
    return null;
  }
}

async function searchInSubfolders(
  parentFolderId: string,
  fileName: string,
  accessToken: string
): Promise<string | null> {
  try {
    // Get all subfolders
    const foldersQuery = `'${parentFolderId}' in parents and mimeType='application/vnd.google-apps.folder'`;
    const foldersResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(foldersQuery)}&fields=files(id,name)`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!foldersResponse.ok) {
      return null;
    }

    const foldersData = await foldersResponse.json();
    
    // Search in each subfolder
    for (const folder of foldersData.files || []) {
      console.log('🔍 Searching subfolder:', folder.name);
      
      const fileInSubfolder = await findFileInDriveFolder(folder.id, fileName, accessToken);
      if (fileInSubfolder) {
        return fileInSubfolder;
      }
    }

    return null;
  } catch (error) {
    console.error('❌ Error searching subfolders:', error);
    return null;
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ photoId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { photoId } = await context.params;
    const { searchParams } = new URL(request.url);

    // Get crop parameters from query string
    const x = parseInt(searchParams.get('x') || '0');
    const y = parseInt(searchParams.get('y') || '0');
    const w = parseInt(searchParams.get('w') || '100');
    const h = parseInt(searchParams.get('h') || '100');

    console.log('🖼️ Serving thumbnail for photo:', photoId, 'with crop:', { x, y, w, h });

    // Find the photo record
    const photo = await prisma.photo.findFirst({
      where: {
        id: photoId,
        event: {
          user: { email: session.user.email }
        }
      },
      include: { event: true }
    });

    if (!photo) {
      console.log('❌ Photo not found:', photoId);
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
    }

    console.log('✅ Photo found:', {
      id: photo.id,
      originalName: photo.originalName,
      driveFileId: photo.driveFileId
    });

    const accessToken = session.accessToken;
    
    if (!accessToken) {
      return NextResponse.json({ error: 'No Google Drive access' }, { status: 401 });
    }

    if (!photo.driveFileId) {
      console.error('❌ Photo missing driveFileId');
      return NextResponse.json({ 
        error: 'Photo record missing Drive folder ID' 
      }, { status: 500 });
    }

    // Find actual file in Drive folder
    const actualFileId = await findFileInDriveFolder(
      photo.driveFileId, 
      photo.originalName, 
      accessToken
    );

    if (!actualFileId) {
      console.error('❌ Could not find file in Drive folder:', photo.originalName);
      return NextResponse.json({ 
        error: 'File not found in Drive folder' 
      }, { status: 404 });
    }

    // Download the file
    console.log('📡 Downloading file from Drive:', actualFileId);
    
    try {
      const driveResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files/${actualFileId}?alt=media`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (!driveResponse.ok) {
        const errorText = await driveResponse.text();
        console.error('❌ Drive download error:', {
          status: driveResponse.status,
          error: errorText
        });
        
        return NextResponse.json({ 
          error: `Failed to download from Google Drive: ${driveResponse.status}` 
        }, { status: driveResponse.status });
      }

      const imageBuffer = await driveResponse.arrayBuffer();
      console.log('✅ Image downloaded, size:', imageBuffer.byteLength);
      
      // Determine content type
      const extension = photo.originalName.split('.').pop()?.toLowerCase();
      const contentType = extension === 'png' ? 'image/png' : 
                         extension === 'gif' ? 'image/gif' : 
                         extension === 'webp' ? 'image/webp' : 'image/jpeg';

      // Return with crop information in headers (client-side cropping)
      return new Response(imageBuffer, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=86400', // Cache for 1 day
          'X-Crop-Info': JSON.stringify({ x, y, w, h }),
          'X-Photo-Info': JSON.stringify({
            id: photo.id,
            originalName: photo.originalName,
            actualFileId: actualFileId,
            size: imageBuffer.byteLength
          }),
        },
      });

    } catch (fetchError) {
      console.error('❌ Network error downloading from Drive:', fetchError);
      return NextResponse.json({ 
        error: 'Network error accessing Google Drive' 
      }, { status: 503 });
    }

  } catch (error) {
    console.error('❌ Failed to serve thumbnail:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
// Update your /api/persons/[personId]/thumbnail/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Same file search function as above
async function findFileInDriveFolder(
  folderId: string, 
  fileName: string, 
  accessToken: string
): Promise<string | null> {
  try {
    // Search for the file by name in the folder
    const searchQuery = `name='${fileName}' and '${folderId}' in parents`;
    console.log('🔍 Searching Drive for thumbnail source:', searchQuery);
    
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
      console.error('Drive search failed for thumbnail:', searchResponse.status);
      return null;
    }

    const searchData = await searchResponse.json();
    
    if (searchData.files && searchData.files.length > 0) {
      const actualFileId = searchData.files[0].id;
      console.log('✅ Found thumbnail source file:', fileName, '->', actualFileId);
      return actualFileId;
    }

    // Search in subfolders
    return await searchInSubfolders(folderId, fileName, accessToken);
  } catch (error) {
    console.error('Error searching for thumbnail source:', error);
    return null;
  }
}

async function searchInSubfolders(
  parentFolderId: string,
  fileName: string,
  accessToken: string
): Promise<string | null> {
  try {
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
    
    for (const folder of foldersData.files || []) {
      console.log('🔍 Searching subfolder for thumbnail:', folder.name);
      
      const fileInSubfolder = await findFileInDriveFolder(folder.id, fileName, accessToken);
      if (fileInSubfolder) {
        return fileInSubfolder;
      }
    }

    return null;
  } catch (error) {
    console.error('Error searching subfolders for thumbnail:', error);
    return null;
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ personId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { personId } = await context.params;
    console.log('🖼️ Generating thumbnail for person:', personId);

    // Get person and their best face
    const person = await prisma.person.findFirst({
      where: {
        id: personId,
        event: {
          user: { email: session.user.email }
        }
      },
      include: {
        faces: {
          include: { photo: true },
          orderBy: { faceConfidence: 'desc' },
          take: 1
        }
      }
    });

    if (!person || person.faces.length === 0) {
      return NextResponse.json({ error: 'Person or thumbnail not found' }, { status: 404 });
    }

    const bestFace = person.faces[0];
    const photo = bestFace.photo;

    console.log('✅ Found best face for thumbnail:', {
      faceId: bestFace.id,
      confidence: bestFace.faceConfidence,
      photoName: photo.originalName,
      driveFolder: photo.driveFileId,
      facialArea: {
        x: bestFace.facialAreaX,
        y: bestFace.facialAreaY,
        w: bestFace.facialAreaW,
        h: bestFace.facialAreaH
      }
    });

    const accessToken = session.accessToken;
    
    if (!accessToken) {
      return NextResponse.json({ error: 'No Google Drive access' }, { status: 401 });
    }

    // Find the actual file in the Drive folder
    const actualFileId = await findFileInDriveFolder(
      photo.driveFileId, // folder ID
      photo.originalName, // file name to search for
      accessToken
    );

    if (!actualFileId) {
      console.error('❌ Could not find thumbnail source file:', photo.originalName);
      return NextResponse.json({ 
        error: 'Thumbnail source file not found in Drive folder' 
      }, { status: 404 });
    }

    // Download the actual file for the thumbnail
    console.log('📡 Downloading thumbnail source from Drive:', actualFileId);
    
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
        console.error('❌ Drive thumbnail download error:', {
          status: driveResponse.status,
          error: errorText
        });
        
        return NextResponse.json({ 
          error: `Failed to download thumbnail from Google Drive: ${driveResponse.status}` 
        }, { status: driveResponse.status });
      }

      const imageBuffer = await driveResponse.arrayBuffer();
      console.log('✅ Thumbnail source downloaded, size:', imageBuffer.byteLength);
      
      const extension = photo.originalName.split('.').pop()?.toLowerCase();
      const contentType = extension === 'png' ? 'image/png' : 
                         extension === 'gif' ? 'image/gif' : 
                         extension === 'webp' ? 'image/webp' : 'image/jpeg';

      // Return image with crop information for client-side cropping
      const cropInfo = {
        x: bestFace.facialAreaX,
        y: bestFace.facialAreaY,
        w: bestFace.facialAreaW,
        h: bestFace.facialAreaH,
        confidence: bestFace.faceConfidence
      };

      return new Response(imageBuffer, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=86400',
          'X-Face-Crop': JSON.stringify(cropInfo),
          'X-Person-Info': JSON.stringify({
            id: person.id,
            name: person.name,
            photoCount: person.photoCount
          }),
          'X-Thumbnail-Info': JSON.stringify({
            originalPhotoId: photo.id,
            actualFileId: actualFileId,
            fileName: photo.originalName
          }),
        },
      });

    } catch (error) {
      console.error('❌ Network error downloading thumbnail:', error);
      return NextResponse.json({ 
        error: 'Network error accessing Google Drive for thumbnail' 
      }, { status: 503 });
    }
    
  } catch (error) {
    console.error('❌ Failed to serve person thumbnail:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
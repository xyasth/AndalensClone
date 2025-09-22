import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
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
  context: { params: Promise<{ photoId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { photoId } = await context.params;
    const { searchParams } = new URL(request.url);

    // Crop params from querystring (?x=...&y=...&w=...&h=...)
    const x = parseInt(searchParams.get('x') || '0');
    const y = parseInt(searchParams.get('y') || '0');
    const w = parseInt(searchParams.get('w') || '100');
    const h = parseInt(searchParams.get('h') || '100');

    // ✅ Check that the photo exists and belongs to the current user’s event
    const photo = await prisma.photo.findFirst({
      where: {
        id: photoId,
        event: {
          user: {
            email: session.user.email,
          },
        },
      },
    });

    if (!photo) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
    }

    // ✅ Handle Google Drive images
    if (photo.driveFileId) {
      const accessToken = session.accessToken;

      if (!accessToken) {
        return NextResponse.json(
          { error: 'No Google Drive access' },
          { status: 401 }
        );
      }

      const actualFileId = await findFileInDriveFolder(
        photo.driveFileId,        // folder ID
        photo.originalName,       // filename to look for
        accessToken
      );

      if (!actualFileId) {
        return NextResponse.json({ error: 'File not found in Drive' }, { status: 404 });
      }

      const driveResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files/${actualFileId}?alt=media`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        }
      );


      if (!driveResponse.ok) {
        console.error('❌ Drive API error:', driveResponse.status);
        return NextResponse.json(
          { error: 'Failed to fetch from Google Drive' },
          { status: driveResponse.status }
        );
      }

      const imageBuffer = await driveResponse.arrayBuffer();

      // Detect content type by file extension
      const extension = photo.originalName.split('.').pop()?.toLowerCase();
      const contentType =
        extension === 'png'
          ? 'image/png'
          : extension === 'gif'
            ? 'image/gif'
            : extension === 'webp'
              ? 'image/webp'
              : 'image/jpeg';

      // 🚨 NOTE: This does NOT crop yet — just attaches crop info in headers
      // Use Sharp/Canvas later if you want actual cropping
      return new Response(imageBuffer, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=86400',
          'X-Crop-Info': JSON.stringify({ x, y, w, h }),
          'X-Photo-Info': JSON.stringify({
            id: photo.id,
            name: photo.originalName,
            driveFileId: photo.driveFileId,
          }),
        },
      });
    }

    return NextResponse.json(
      { error: 'Local file serving not implemented' },
      { status: 501 }
    );
  } catch (error) {
    console.error('❌ Failed to serve photo thumbnail:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

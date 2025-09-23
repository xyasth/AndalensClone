import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: { photoId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { photoId } = params;

    // Find the photo and verify user access
    const photo = await prisma.photo.findFirst({
      where: {
        id: photoId,
        event: {
          user: {
            email: session.user.email
          }
        }
      },
      include: {
        event: true
      }
    });

    if (!photo) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
    }

    // If photo is from Google Drive, get it from Drive API
    if (photo.driveFileId) {
      const accessToken = (session as any).accessToken;
      
      if (!accessToken) {
        return NextResponse.json({ error: 'No Google Drive access' }, { status: 401 });
      }

      const driveResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files/${photo.driveFileId}?alt=media`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (!driveResponse.ok) {
        return NextResponse.json({ error: 'Failed to fetch from Google Drive' }, { status: 404 });
      }

      const imageBuffer = await driveResponse.arrayBuffer();
      
      // Determine content type from original name
      const extension = photo.originalName.split('.').pop()?.toLowerCase();
      const contentType = extension === 'png' ? 'image/png' : 
                         extension === 'gif' ? 'image/gif' : 
                         extension === 'webp' ? 'image/webp' : 'image/jpeg';

      return new Response(imageBuffer, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000',
        },
      });
    }

    // For local files (not implemented yet)
    return NextResponse.json({ error: 'Local file serving not implemented' }, { status: 501 });
  } catch (error) {
    console.error('Failed to serve photo:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

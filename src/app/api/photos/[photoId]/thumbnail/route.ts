// api/photos/[photoId]/thumbnail/route.ts - FIXED: Use album->event relation
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { PrismaClient } from '@prisma/client';
import sharp from 'sharp';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ photoId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await context.params;
    const { photoId } = params;
    
    const { searchParams } = new URL(request.url);
    const x = parseInt(searchParams.get('x') || '0');
    const y = parseInt(searchParams.get('y') || '0');
    const w = parseInt(searchParams.get('w') || '100');
    const h = parseInt(searchParams.get('h') || '100');
    const size = parseInt(searchParams.get('size') || '200'); // Output size

    console.log('🖼️ Serving cropped thumbnail for photo:', photoId, `Crop: ${x},${y},${w}x${h} -> ${size}x${size}`);

    // FIXED: Use album relation to access event and user
    const photo = await prisma.photo.findFirst({
      where: {
        id: photoId,
        album: {
          event: {
            user: {
              email: session.user.email
            }
          }
        }
      }
    });

    if (!photo) {
      console.error('❌ Photo not found for thumbnail:', photoId);
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
    }

    // If photo is from Google Drive, get and crop it
    if (photo.driveFileId) {
      const accessToken = (session as any).accessToken;
      
      if (!accessToken) {
        console.error('❌ No Google Drive access token for thumbnail');
        return NextResponse.json({ error: 'No Google Drive access' }, { status: 401 });
      }

      // Get the full image first
      const driveResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files/${photo.driveFileId}?alt=media`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (!driveResponse.ok) {
        console.error('❌ Drive API error for thumbnail:', driveResponse.status);
        return NextResponse.json({ error: 'Failed to fetch from Google Drive' }, { status: 404 });
      }

      const imageBuffer = await driveResponse.arrayBuffer();
      
      try {
        // Crop and resize the image using Sharp
        const croppedBuffer = await sharp(Buffer.from(imageBuffer))
          .extract({ 
            left: Math.max(0, x), 
            top: Math.max(0, y), 
            width: w, 
            height: h 
          })
          .resize(size, size, { 
            fit: 'cover',
            position: 'center'
          })
          .jpeg({ quality: 85 })
          .toBuffer();

        console.log('✅ Serving cropped thumbnail successfully:', photo.originalName);

        return new Response(new Uint8Array(croppedBuffer), {
          headers: {
            'Content-Type': 'image/jpeg',
            'Cache-Control': 'public, max-age=86400',
          },
        });
      } catch (sharpError) {
        console.error('❌ Sharp processing error:', sharpError);
        return NextResponse.json({ error: 'Image processing failed' }, { status: 500 });
      }
    }

    return NextResponse.json({ error: 'Local file serving not implemented' }, { status: 501 });
  } catch (error) {
    console.error('❌ Failed to serve thumbnail:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
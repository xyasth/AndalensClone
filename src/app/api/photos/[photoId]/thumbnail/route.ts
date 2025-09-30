// api/photos/[photoId]/thumbnail/route.ts - FIXED
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
    const { photoId } = await params;

    const { searchParams } = new URL(request.url);
    const x = parseInt(searchParams.get('x') || '0');
    const y = parseInt(searchParams.get('y') || '0');
    const w = parseInt(searchParams.get('w') || '100');
    const h = parseInt(searchParams.get('h') || '100');
    const size = parseInt(searchParams.get('size') || '200');

    console.log('🖼️ Serving cropped thumbnail for photo:', photoId, `Crop: ${x},${y},${w}x${h} -> ${size}x${size}`);

    // Find photo with user access verification through album->event->user
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
        // Get image metadata to validate crop coordinates
        const image = sharp(Buffer.from(imageBuffer));
        const metadata = await image.metadata();
        
        if (!metadata.width || !metadata.height) {
          throw new Error('Could not determine image dimensions');
        }

        // Validate and clamp crop coordinates
        const safeX = Math.max(0, Math.min(x, metadata.width - 1));
        const safeY = Math.max(0, Math.min(y, metadata.height - 1));
        const safeW = Math.max(1, Math.min(w, metadata.width - safeX));
        const safeH = Math.max(1, Math.min(h, metadata.height - safeY));

        console.log(`📐 Image: ${metadata.width}x${metadata.height}, Crop: ${safeX},${safeY} ${safeW}x${safeH}`);

        // Crop and resize the image using Sharp
        const croppedBuffer = await sharp(Buffer.from(imageBuffer))
          .extract({
            left: safeX,
            top: safeY,
            width: safeW,
            height: safeH
          })
          .resize(size, size, {
            fit: 'cover',
            position: 'center'
          })
          .jpeg({ quality: 85 })
          .toBuffer();

        console.log('✅ Serving cropped thumbnail successfully:', photo.originalName);

        return new Response(croppedBuffer, {
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
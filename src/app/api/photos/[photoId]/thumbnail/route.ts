// api/photos/[photoId]/thumbnail/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { PrismaClient } from '@prisma/client';

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

    // FIX: Await params in Next.js 15
    const params = await context.params;
    const { photoId } = params;
    
    const { searchParams } = new URL(request.url);
    const x = parseInt(searchParams.get('x') || '0');
    const y = parseInt(searchParams.get('y') || '0');
    const w = parseInt(searchParams.get('w') || '100');
    const h = parseInt(searchParams.get('h') || '100');

    console.log('🖼️ Serving thumbnail for photo:', photoId, `Crop: ${x},${y},${w}x${h}`);

    // Find the photo and verify user access
    const photo = await prisma.photo.findFirst({
      where: {
        id: photoId,
        event: {
          user: {
            email: session.user.email
          }
        }
      }
    });

    if (!photo) {
      console.error('❌ Photo not found for thumbnail:', photoId);
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
    }

    // If photo is from Google Drive, get thumbnail
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

      // For now, return the full image with crop parameters
      // In production, you'd want to implement actual image cropping using Sharp or Canvas
      const imageBuffer = await driveResponse.arrayBuffer();
      
      const extension = photo.originalName.split('.').pop()?.toLowerCase();
      const contentType = extension === 'png' ? 'image/png' : 
                         extension === 'gif' ? 'image/gif' : 
                         extension === 'webp' ? 'image/webp' : 'image/jpeg';

      console.log('✅ Serving thumbnail successfully:', photo.originalName);

      return new Response(imageBuffer, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=86400',
          'X-Crop-Info': JSON.stringify({ x, y, w, h }),
        },
      });
    }

    return NextResponse.json({ error: 'Local file serving not implemented' }, { status: 501 });
  } catch (error) {
    console.error('❌ Failed to serve thumbnail:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
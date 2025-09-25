// api/albums/[albumId]/route.ts - Individual album operations
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: { albumId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { albumId } = await params;

    const album = await prisma.album.findFirst({
      where: {
        id: albumId,
        event: {
          user: { email: session.user.email }
        }
      },
      include: {
        event: true,
        driveFolders: true,
        _count: {
          select: {
            photos: true
          }
        }
      }
    });

    if (!album) {
      return NextResponse.json({ error: 'Album not found' }, { status: 404 });
    }

    const responseAlbum = {
      id: album.id,
      name: album.name,
      description: album.description,
      eventId: album.eventId,
      photoCount: album._count.photos,
      status: album.status.toLowerCase(),
      createdAt: album.createdAt.toISOString(),
      updatedAt: album.updatedAt.toISOString(),
      event: {
        id: album.event.id,
        name: album.event.name,
        title: album.event.title
      },
      driveFolders: album.driveFolders.map(folder => ({
        id: folder.id,
        name: folder.name,
        driveLink: folder.driveLink,
        driveFolderId: folder.driveFolderId,
        photoCount: folder.photoCount,
        status: folder.status.toLowerCase()
      }))
    };

    return NextResponse.json(responseAlbum);
  } catch (error) {
    console.error('Failed to fetch album:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { albumId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { albumId } = params;
    const { name, description } = await request.json();

    if (!name) {
      return NextResponse.json({ error: 'Album name is required' }, { status: 400 });
    }

    const album = await prisma.album.updateMany({
      where: {
        id: albumId,
        event: {
          user: { email: session.user.email }
        }
      },
      data: {
        name,
        description,
        updatedAt: new Date()
      }
    });

    if (album.count === 0) {
      return NextResponse.json({ error: 'Album not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Album updated successfully' });
  } catch (error) {
    console.error('Failed to update album:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
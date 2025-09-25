// api/events/[eventId]/albums/route.ts - Get/Create albums for an event
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { eventId } = await params;

    // Verify user owns this event
    const event = await prisma.event.findFirst({
      where: {
        id: eventId,
        user: { email: session.user.email }
      },
      include: {
        albums: {
          include: {
            driveFolders: true,
            _count: {
              select: {
                photos: true
              }
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found or access denied' }, { status: 403 });
    }

    const albums = event.albums.map(album => ({
      id: album.id,
      name: album.name,
      description: album.description,
      eventId: album.eventId,
      photoCount: album._count.photos,
      status: album.status.toLowerCase(),
      createdAt: album.createdAt.toISOString(),
      updatedAt: album.updatedAt.toISOString(),
      driveFolders: album.driveFolders.map(folder => ({
        id: folder.id,
        name: folder.name,
        driveLink: folder.driveLink,
        driveFolderId: folder.driveFolderId,
        photoCount: folder.photoCount,
        status: folder.status.toLowerCase()
      }))
    }));

    return NextResponse.json(albums);
  } catch (error) {
    console.error('Failed to fetch albums:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { eventId } = await params;
    const { name, description, driveFolders = [] } = await request.json();

    if (!name) {
      return NextResponse.json({ error: 'Album name is required' }, { status: 400 });
    }

    // Verify user owns this event
    const event = await prisma.event.findFirst({
      where: {
        id: eventId,
        user: { email: session.user.email }
      }
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found or access denied' }, { status: 403 });
    }

    // Create album with drive folders
    const album = await prisma.album.create({
      data: {
        name,
        description,
        eventId,
        status: 'ACTIVE',
        driveFolders: {
          create: driveFolders.map((folder: any) => ({
            name: folder.name || 'Untitled Folder',
            driveLink: folder.driveLink,
            driveFolderId: extractFolderId(folder.driveLink),
            status: 'ACTIVE'
          }))
        }
      },
      include: {
        driveFolders: true,
        _count: {
          select: {
            photos: true
          }
        }
      }
    });

    const responseAlbum = {
      id: album.id,
      name: album.name,
      description: album.description,
      eventId: album.eventId,
      photoCount: album._count.photos,
      status: album.status.toLowerCase(),
      createdAt: album.createdAt.toISOString(),
      updatedAt: album.updatedAt.toISOString(),
      driveFolders: album.driveFolders.map(folder => ({
        id: folder.id,
        name: folder.name,
        driveLink: folder.driveLink,
        driveFolderId: folder.driveFolderId,
        photoCount: folder.photoCount,
        status: folder.status.toLowerCase()
      }))
    };

    return NextResponse.json(responseAlbum, { status: 201 });
  } catch (error) {
    console.error('Failed to create album:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function extractFolderId(driveLink: string): string {
  if (!driveLink) return '';
  const match = driveLink.match(/\/folders\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : '';
}
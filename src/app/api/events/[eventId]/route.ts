// api/events/[eventId]/route.ts - FIXED: Remove non-existent fields
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

    // FIXED: Use proper relations and counts
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
          }
        },
        _count: {
          select: {
            persons: true // This works - persons belong to events
          }
        }
      }
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Calculate photo count from all albums
    const totalPhotos = event.albums.reduce((sum, album) => sum + album._count.photos, 0);

    const responseEvent = {
      id: event.id,
      name: event.name,
      title: event.title,
      description: event.description,
      createdAt: event.createdAt.toISOString(),
      updatedAt: event.updatedAt.toISOString(),
      photoCount: totalPhotos, // FIXED: Calculate from albums
      personCount: event._count.persons,
      status: event.status.toLowerCase(),
      
      // FIXED: Include album information (new structure)
      albums: event.albums.map(album => ({
        id: album.id,
        name: album.name,
        description: album.description,
        photoCount: album._count.photos,
        status: album.status.toLowerCase(),
        driveFolders: album.driveFolders.map(folder => ({
          id: folder.id,
          name: folder.name,
          driveLink: folder.driveLink,
          driveFolderId: folder.driveFolderId,
          photoCount: folder.photoCount,
          status: folder.status.toLowerCase()
        }))
      })),
      
      // Summary counts
      totalAlbums: event.albums.length,
      totalDriveFolders: event.albums.reduce((sum, album) => sum + album.driveFolders.length, 0)
    };

    return NextResponse.json(responseEvent);
  } catch (error) {
    console.error('Failed to fetch event:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { eventId } = await params;
    const { name, title, description } = await request.json();

    if (!name || !title) {
      return NextResponse.json({ error: 'Name and title are required' }, { status: 400 });
    }

    const event = await prisma.event.updateMany({
      where: {
        id: eventId,
        user: { email: session.user.email }
      },
      data: {
        name,
        title,
        description,
        updatedAt: new Date()
      }
    });

    if (event.count === 0) {
      return NextResponse.json({ error: 'Event not found or access denied' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Event updated successfully' });
  } catch (error) {
    console.error('Failed to update event:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
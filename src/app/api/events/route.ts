// api/events/route.ts - Updated to support Album creation
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        events: {
          orderBy: { createdAt: 'desc' },
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
                persons: true
              }
            }
          }
        }
      }
    });

    if (!user) {
      // Auto-create user if they don't exist
      const newUser = await prisma.user.create({
        data: {
          email: session.user.email,
          name: session.user.name,
          image: session.user.image
        },
        include: {
          events: {
            orderBy: { createdAt: 'desc' },
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
                  persons: true
                }
              }
            }
          }
        }
      });
      
      return NextResponse.json([]);
    }

    const events = user.events.map(event => ({
      id: event.id,
      name: event.name,
      title: event.title,
      description: event.description,
      createdAt: event.createdAt.toISOString(),
      status: event.status.toLowerCase(),
      personCount: event._count.persons,
      
      // NEW: Album information
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
      totalDriveFolders: event.albums.reduce((sum, album) => sum + album.driveFolders.length, 0),
      totalPhotos: event.albums.reduce((sum, album) => sum + album._count.photos, 0)
    }));

    return NextResponse.json(events);
  } catch (error) {
    console.error('Failed to fetch events:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, title, description, albums = [] } = body;

    if (!name || !title) {
      return NextResponse.json({ error: 'Name and title are required' }, { status: 400 });
    }

    // Find or create user
    const user = await prisma.user.upsert({
      where: { email: session.user.email },
      create: {
        email: session.user.email,
        name: session.user.name,
        image: session.user.image
      },
      update: {
        name: session.user.name,
        image: session.user.image
      }
    });

    // Create event with albums and drive folders
    const event = await prisma.event.create({
      data: {
        name,
        title,
        description,
        userId: user.id,
        status: 'ACTIVE',
        albums: {
          create: albums.map((album: any) => ({
            name: album.name || 'Default Album',
            description: album.description,
            status: 'ACTIVE',
            driveFolders: {
              create: (album.driveFolders || []).map((folder: any) => ({
                name: folder.name || 'Untitled Folder',
                driveLink: folder.driveLink,
                driveFolderId: extractFolderId(folder.driveLink),
                status: 'ACTIVE'
              }))
            }
          }))
        }
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
            persons: true
          }
        }
      }
    });

    // Transform response
    const responseEvent = {
      id: event.id,
      name: event.name,
      title: event.title,
      description: event.description,
      createdAt: event.createdAt.toISOString(),
      status: event.status.toLowerCase(),
      personCount: event._count.persons,
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
      totalAlbums: event.albums.length,
      totalDriveFolders: event.albums.reduce((sum, album) => sum + album.driveFolders.length, 0),
      totalPhotos: 0
    };

    return NextResponse.json(responseEvent, { status: 201 });
  } catch (error) {
    console.error('Failed to create event:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function extractFolderId(driveLink: string): string {
  if (!driveLink) return '';
  const match = driveLink.match(/\/folders\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : '';
}
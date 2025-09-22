import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Events API - Starting session check...');
    const session = await getServerSession(authOptions);
    
    console.log('📊 Session data:', {
      hasSession: !!session,
      hasUser: !!session?.user,
      userEmail: session?.user?.email,
      hasAccessToken: !!session?.accessToken
    });
    
    if (!session?.user?.email) {
      console.log('❌ No session or user email found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔍 Looking for user in database:', session.user.email);
    
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        events: {
          orderBy: { createdAt: 'desc' },
          include: {
            _count: {
              select: {
                photos: true,
                persons: true
              }
            }
          }
        }
      }
    });

    if (!user) {
      console.log('❌ User not found in database, creating...');
      
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
              _count: {
                select: {
                  photos: true,
                  persons: true
                }
              }
            }
          }
        }
      });
      
      console.log('✅ User created successfully');
      
      const events = newUser.events.map(event => ({
        id: event.id,
        name: event.name,
        title: event.title,
        description: event.description,
        createdAt: event.createdAt.toISOString(),
        photoCount: event._count.photos,
        personCount: event._count.persons,
        status: event.status.toLowerCase(),
        driveLink: event.driveLink,
        driveFolderId: event.driveFolderId
      }));

      return NextResponse.json(events);
    }

    console.log('✅ User found, returning events:', user.events.length);

    const events = user.events.map(event => ({
      id: event.id,
      name: event.name,
      title: event.title,
      description: event.description,
      createdAt: event.createdAt.toISOString(),
      photoCount: event._count.photos,
      personCount: event._count.persons,
      status: event.status.toLowerCase(),
      driveLink: event.driveLink,
      driveFolderId: event.driveFolderId
    }));

    return NextResponse.json(events);
  } catch (error) {
    console.error('❌ Failed to fetch events:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Events API POST - Starting session check...');
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      console.log('❌ No session or user email found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, title, description, driveLink, driveFolderId } = body;

    console.log('📝 Creating event with data:', { name, title, driveLink, driveFolderId });

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

    // Create event
    const event = await prisma.event.create({
      data: {
        name,
        title,
        description,
        userId: user.id,
        driveLink,
        driveFolderId,
        status: 'ACTIVE'
      },
      include: {
        _count: {
          select: {
            photos: true,
            persons: true
          }
        }
      }
    });

    console.log('✅ Event created successfully:', event.id);

    // Transform to match your interface
    const responseEvent = {
      id: event.id,
      name: event.name,
      title: event.title,
      description: event.description,
      createdAt: event.createdAt.toISOString(),
      photoCount: event._count.photos,
      personCount: event._count.persons,
      status: event.status.toLowerCase(),
      driveLink: event.driveLink,
      driveFolderId: event.driveFolderId
    };

    return NextResponse.json(responseEvent, { status: 201 });
  } catch (error) {
    console.error('❌ Failed to create event:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
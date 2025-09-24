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

    const event = await prisma.event.findFirst({
      where: {
        id: eventId,
        user: { email: session.user.email }
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

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const responseEvent = {
      id: event.id,
      name: event.name,
      title: event.title,
      description: event.description,
      createdAt: event.createdAt.toISOString(),
      updatedAt: event.updatedAt.toISOString(),
      photoCount: event._count.photos,
      personCount: event._count.persons,
      status: event.status.toLowerCase(),
      driveLink: event.driveLink,
      driveFolderId: event.driveFolderId
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

    const { eventId } = params;
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
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

    const { eventId } = params;

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

    const eventData = {
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

    return NextResponse.json(eventData);
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
    const body = await request.json();
    const { name, title, description } = body;

    const existingEvent = await prisma.event.findFirst({
      where: {
        id: eventId,
        user: { email: session.user.email }
      }
    });

    if (!existingEvent) {
      return NextResponse.json({ error: 'Event not found or access denied' }, { status: 403 });
    }

    const updatedEvent = await prisma.event.update({
      where: { id: eventId },
      data: {
        name: name || existingEvent.name,
        title: title || existingEvent.title,
        description: description !== undefined ? description : existingEvent.description,
        updatedAt: new Date()
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

    const eventData = {
      id: updatedEvent.id,
      name: updatedEvent.name,
      title: updatedEvent.title,
      description: updatedEvent.description,
      createdAt: updatedEvent.createdAt.toISOString(),
      photoCount: updatedEvent._count.photos,
      personCount: updatedEvent._count.persons,
      status: updatedEvent.status.toLowerCase(),
      driveLink: updatedEvent.driveLink,
      driveFolderId: updatedEvent.driveFolderId
    };

    return NextResponse.json(eventData);
  } catch (error) {
    console.error('Failed to update event:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
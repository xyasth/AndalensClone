import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: { personId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { personId } = params;

    const person = await prisma.person.findFirst({
      where: {
        id: personId,
        event: {
          user: {
            email: session.user.email
          }
        }
      },
      include: {
        event: true
      }
    });

    if (!person) {
      return NextResponse.json({ error: 'Person not found' }, { status: 404 });
    }

    const responsePerson = {
      id: person.id,
      name: person.name,
      eventId: person.eventId,
      cluster_id: person.clusterId,
      photoCount: person.photoCount,
      thumbnailPath: person.thumbnailPath,
      averageConfidence: person.averageConfidence,
      createdAt: person.createdAt.toISOString(),
      updatedAt: person.updatedAt.toISOString(),
      event: {
        id: person.event.id,
        name: person.event.name,
        title: person.event.title
      }
    };

    return NextResponse.json(responsePerson);
  } catch (error) {
    console.error('Failed to fetch person:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { personId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { personId } = params;
    const { name } = await request.json();

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const person = await prisma.person.updateMany({
      where: {
        id: personId,
        event: {
          user: {
            email: session.user.email
          }
        }
      },
      data: {
        name: name.trim(),
        updatedAt: new Date()
      }
    });

    if (person.count === 0) {
      return NextResponse.json({ error: 'Person not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Person updated successfully' });
  } catch (error) {
    console.error('Failed to update person:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
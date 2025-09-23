import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ personId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { personId } = await context.params;
    
    console.log('🔍 Fetching person data for:', personId);

    // Get person with event details
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
      console.log('❌ Person not found:', personId);
      return NextResponse.json({ error: 'Person not found' }, { status: 404 });
    }

    console.log('✅ Person found:', {
      id: person.id,
      name: person.name,
      clusterId: person.clusterId,
      eventId: person.eventId
    });

    // Return person data in expected format
    const responseData = {
      id: person.id,
      name: person.name,
      cluster_id: person.clusterId, // Key fix: match frontend expectations
      eventId: person.eventId,
      photoCount: person.photoCount,
      averageConfidence: person.averageConfidence,
      thumbnailPath: person.thumbnailPath,
      event: {
        id: person.event.id,
        name: person.event.name,
        title: person.event.title
      },
      createdAt: person.createdAt.toISOString(),
      updatedAt: person.updatedAt.toISOString()
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('❌ Failed to fetch person:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ personId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { personId } = await context.params;
    const { name } = await request.json();

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Update person name (with user verification)
    const updatedPerson = await prisma.person.updateMany({
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

    if (updatedPerson.count === 0) {
      return NextResponse.json({ error: 'Person not found or access denied' }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Person name updated successfully' 
    });
  } catch (error) {
    console.error('❌ Failed to update person:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
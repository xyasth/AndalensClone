import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ eventId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { eventId } = await context.params;

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

    // Get all persons for this event
    const persons = await prisma.person.findMany({
      where: { eventId: eventId },
      orderBy: [
        { photoCount: 'desc' }, // Most photos first
        { averageConfidence: 'desc' } // Then by confidence
      ]
    });

    const personsData = persons.map(person => ({
      id: person.id,
      name: person.name,
      eventId: person.eventId,
      cluster_id: person.clusterId,
      photoCount: person.photoCount,
      thumbnailPath: person.thumbnailPath,
      averageConfidence: person.averageConfidence,
      createdAt: person.createdAt.toISOString(),
      updatedAt: person.updatedAt.toISOString()
    }));

    console.log(`✅ Fetched ${personsData.length} persons for event ${eventId}`);
    return NextResponse.json(personsData);
  } catch (error) {
    console.error('Failed to fetch persons:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
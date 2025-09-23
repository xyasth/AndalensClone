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
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    console.log('🔍 Fetching photos for person:', personId);

    // First verify person exists and user has access
    const person = await prisma.person.findFirst({
      where: {
        id: personId,
        event: {
          user: { email: session.user.email }
        }
      },
      include: { event: true }
    });

    if (!person) {
      return NextResponse.json({ error: 'Person not found' }, { status: 404 });
    }

    // Get all faces for this person with their photos
    const faces = await prisma.face.findMany({
      where: { personId: personId },
      include: {
        photo: true
      },
      orderBy: [
        { faceConfidence: 'desc' }, // Best faces first
        { photo: { uploadedAt: 'desc' } }
      ],
      skip,
      take: limit
    });

    const total = await prisma.face.count({
      where: { personId: personId }
    });

    // Transform to match expected format
    const photos = faces.map(face => ({
      id: face.photo.id,
      originalName: face.photo.originalName,
      path: face.photo.path,
      eventId: face.photo.eventId,
      uploadedAt: face.photo.uploadedAt.toISOString(),
      isGoodQuality: face.photo.isGoodQuality,
      qualityScore: face.photo.qualityScore,
      processedAt: face.photo.processedAt?.toISOString(),
      status: face.photo.status.toLowerCase(),
      driveFileId: face.photo.driveFileId,
      faces: [{
        foto_id: face.fotoId,
        album: {
          id: person.eventId,
          name: person.event.name,
          event: { id: person.eventId, name: person.event.name }
        },
        embedding: face.embedding,
        cluster_id: face.clusterId,
        path: face.photo.path,
        facial_area: {
          x: face.facialAreaX,
          y: face.facialAreaY,
          w: face.facialAreaW,
          h: face.facialAreaH
        },
        face_confidence: face.faceConfidence
      }]
    }));

    console.log(`✅ Fetched ${photos.length} photos for person ${person.name}`);

    return NextResponse.json({
      photos,
      person: {
        id: person.id,
        name: person.name,
        cluster_id: person.clusterId,
        eventId: person.eventId,
        event: {
          id: person.event.id,
          name: person.event.name,
          title: person.event.title
        }
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('❌ Failed to fetch person photos:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
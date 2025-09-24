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
      }
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found or access denied' }, { status: 403 });
    }

    const photos = await prisma.photo.findMany({
      where: { eventId: eventId },
      include: {
        faces: {
          include: {
            person: true
          }
        }
      },
      orderBy: { uploadedAt: 'desc' }
    });

    const photosData = photos.map(photo => ({
      id: photo.id,
      originalName: photo.originalName,
      path: photo.path,
      eventId: photo.eventId,
      uploadedAt: photo.uploadedAt.toISOString(),
      isGoodQuality: photo.isGoodQuality,
      qualityScore: photo.qualityScore,
      processedAt: photo.processedAt?.toISOString(),
      status: photo.status.toLowerCase(),
      driveFileId: photo.driveFileId,
      faces: photo.faces.map(face => ({
        foto_id: face.fotoId,
        album: {
          id: eventId,
          name: event.name,
          event: { id: eventId, name: event.name }
        },
        embedding: face.embedding,
        cluster_id: face.clusterId,
        path: photo.path,
        facial_area: {
          x: face.facialAreaX,
          y: face.facialAreaY,
          w: face.facialAreaW,
          h: face.facialAreaH
        },
        face_confidence: face.faceConfidence
      }))
    }));

    return NextResponse.json(photosData);
  } catch (error) {
    console.error('Failed to fetch photos:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
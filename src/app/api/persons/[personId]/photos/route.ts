// Fixed API route: /api/persons/[personId]/photos/route.ts
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

    const { personId } = await params;
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

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

    // Get all faces for this person with their photos
    const faces = await prisma.face.findMany({
      where: {
        personId: personId
      },
      include: {
        photo: {
          include: {
            album: true,
            // Include ALL faces for each photo, not just the person's faces
            faces: {
              include: {
                person: true
              }
            }
          }
        }
      },
      orderBy: {
        photo: {
          uploadedAt: 'desc'
        }
      },
      skip,
      take: limit
    });

    const total = await prisma.face.count({
      where: { personId: personId }
    });

    // Group faces by photo and create proper photo objects
    const photoMap = new Map();
    
    faces.forEach(face => {
      const photo = face.photo;
      if (!photoMap.has(photo.id)) {
        photoMap.set(photo.id, {
          id: photo.id,
          originalName: photo.originalName,
          path: photo.path,
          eventId: photo.eventId,
          albumId: photo.albumId,
          uploadedAt: photo.uploadedAt.toISOString(),
          isGoodQuality: photo.isGoodQuality,
          qualityScore: photo.qualityScore,
          processedAt: photo.processedAt?.toISOString(),
          status: photo.status.toLowerCase(),
          faces: [] // Will be populated below
        });
      }
    });

    // Now populate the faces for each photo
    faces.forEach(face => {
      const photo = photoMap.get(face.photo.id);
      if (photo) {
        // Add ALL faces for this photo, not just the person's face
        face.photo.faces.forEach(photoFace => {
          photo.faces.push({
            id: photoFace.id,
            personId: photoFace.personId,
            clusterId: photoFace.clusterId,
            facialAreaX: photoFace.facialAreaX,
            facialAreaY: photoFace.facialAreaY,
            facialAreaW: photoFace.facialAreaW,
            facialAreaH: photoFace.facialAreaH,
            faceConfidence: photoFace.faceConfidence,
            embedding: photoFace.embedding,
            // Legacy format for backward compatibility
            foto_id: photoFace.fotoId,
            facial_area: {
              x: photoFace.facialAreaX,
              y: photoFace.facialAreaY,
              w: photoFace.facialAreaW,
              h: photoFace.facialAreaH
            },
            face_confidence: photoFace.faceConfidence
          });
        });
      }
    });

    const responsePhotos = Array.from(photoMap.values());

    return NextResponse.json({
      photos: responsePhotos,
      person: {
        id: person.id,
        name: person.name,
        clusterId: person.clusterId,
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
    console.error('Failed to fetch person photos:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
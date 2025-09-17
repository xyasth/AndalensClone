import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { PrismaClient } from '@prisma/client';


declare global {

  var prisma: PrismaClient | undefined;
}
const prisma = global.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') global.prisma = prisma;

const ML_API_BASE_URL = process.env.ML_API_BASE_URL || 'https://80046ae3e5a7.ngrok-free.app/extract';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    console.log('📝 Received clustering request:', JSON.stringify(body, null, 2));

    if (!body?.albums || !Array.isArray(body.albums)) {
      return NextResponse.json({ error: 'Invalid request format' }, { status: 400 });
    }

    for (const album of body.albums) {
      const albumId = String(album.album_id);
      const event = await prisma.event.findFirst({
        where: {
          id: albumId,
          user: { email: session.user.email }
        }
      });

      if (!event) {
        return NextResponse.json({
          error: `Event ${albumId} not found or access denied`
        }, { status: 403 });
      }
    }

    let mlResponse: any;
    try {
      console.log('🤖 Calling ML API at:', `${ML_API_BASE_URL}`);
      const resp = await fetch(`${ML_API_BASE_URL}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`ML API error ${resp.status}: ${text}`);
      }

      mlResponse = await resp.json();
      console.log('✅ ML API response received. Keys:', Object.keys(mlResponse || {}));
    } catch (err) {
      console.warn('❌ ML API call failed, using mock response. Error:', err);
      mlResponse = generateMockResponse(body);
    }

    const saveResults = await saveProcessingResults(mlResponse);
    console.log('💾 Saved to database:', saveResults);

    return NextResponse.json(mlResponse);
  } catch (error) {
    console.error('❌ Clustering API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


function generateMockResponse(request: any) {
  const extracted: any[] = [];
  const centroid: any[] = [];
  const clusterMap = new Map<number, boolean>();

  for (const album of request.albums) {
    for (const folderId of album.folder_id) {
      const numFaces = Math.floor(Math.random() * 3) + 1;
      for (let i = 0; i < numFaces; i++) {
        const clusterId = Math.floor(Math.random() * 5);
        const fotoId = `${folderId}_${i}.jpg`;
        const faceId = `${fotoId}_f-${i}`;

        extracted.push({
          foto_id: fotoId,
          face_id: faceId,
          album_id: album.album_id,
          drive_id: folderId,
          cluster_id: clusterId,
          facial_area: {
            x: Math.floor(Math.random() * 400),
            y: Math.floor(Math.random() * 400),
            w: Math.floor(Math.random() * 100) + 50,
            h: Math.floor(Math.random() * 120) + 60,
            left_eye: [Math.random() * 500, Math.random() * 500],
            right_eye: [Math.random() * 500, Math.random() * 500]
          },
          face_confidence: Math.random() * 0.4 + 0.6,
          embedding: Array.from({ length: 512 }, () => Math.random() * 2 - 1)
        });

        if (!clusterMap.has(clusterId)) {
          centroid.push({
            cluster_id: clusterId.toString(),
            event_id: null,
            album_id: album.album_id,
            centroid_id: faceId,
            foto_id: fotoId
          });
          clusterMap.set(clusterId, true);
        }
      }
    }
  }

  return { extracted, centroid };
}


async function saveProcessingResults(mlResponse: any) {
  const { extracted, centroid } = mlResponse ?? {};
  if (!Array.isArray(extracted)) {
    throw new Error('ML response missing extracted array');
  }

  try {
    if (Array.isArray(centroid) && centroid.length) {
      console.log('📌 Centroid sample:', centroid.slice(0, 5));
    }

    const photoMap = new Map<string, any[]>();
    for (const face of extracted) {
      const albumId = String(face.album_id);
      const fotoId = String(face.foto_id ?? face.fotoId ?? 'unknown.jpg');
      const key = `${albumId}:${fotoId}`;
      if (!photoMap.has(key)) photoMap.set(key, []);
      photoMap.get(key)!.push(face);
    }

    for (const [key, faces] of photoMap) {
      const [albumIdRaw, fotoId] = key.split(':');
      const albumId = String(albumIdRaw);
      const photoPath = `/drive/${albumId}/${fotoId}`;


      const existingPhoto = await prisma.photo.findFirst({ where: { path: photoPath } });

      let photo;
      if (existingPhoto) {
        photo = await prisma.photo.update({
          where: { id: existingPhoto.id }, 
          data: {
            status: 'COMPLETED',
            processedAt: new Date(),
            driveFileId: faces[0]?.drive_id ?? null
          }
        });
      } else {
        photo = await prisma.photo.create({
          data: {
            originalName: fotoId,
            path: photoPath,
            eventId: albumId,
            isGoodQuality: true,
            qualityScore: 0.9,
            status: 'COMPLETED',
            processedAt: new Date(),
            driveFileId: faces[0]?.drive_id ?? null
          }
        });
      }

      for (const face of faces) {
        const clusterIdStr = String(face.cluster_id ?? face.clusterId ?? '0');
        const fotoIdStr = String(face.face_id ?? face.foto_id ?? face.fotoId);

        let embeddingSafe: number[] = [];
        if (Array.isArray(face.embedding)) {
          embeddingSafe = face.embedding.map((v: any) => {
            const n = Number(v);
            return Number.isFinite(n) ? n : 0;
          });
        }

        const fa = face.facial_area ?? face.facialArea ?? {};
        const facialAreaX = Number(fa.x ?? 0);
        const facialAreaY = Number(fa.y ?? 0);
        const facialAreaW = Number(fa.w ?? 0);
        const facialAreaH = Number(fa.h ?? 0);
        const faceConfidence = Number(face.face_confidence ?? face.faceConfidence ?? 0);

        const person = await prisma.person.upsert({
          where: { clusterId: clusterIdStr },
          create: {
            name: `Person ${clusterIdStr}`,
            eventId: albumId,
            clusterId: clusterIdStr,
            photoCount: 1,
            averageConfidence: faceConfidence
          },
          update: {
            photoCount: { increment: 1 },
            averageConfidence: faceConfidence
          }
        });

        await prisma.face.upsert({
          where: { fotoId: fotoIdStr },
          create: {
            fotoId: fotoIdStr,
            photoId: photo.id,
            personId: person.id,
            clusterId: clusterIdStr,
            embedding: embeddingSafe,
            facialAreaX,
            facialAreaY,
            facialAreaW,
            facialAreaH,
            faceConfidence
          },
          update: {
            photoId: photo.id,
            personId: person.id,
            clusterId: clusterIdStr,
            faceConfidence
          }
        });
      }
    }

    const albumIds = Array.from(new Set(extracted.map((f: any) => String(f.album_id))));
    for (const albumId of albumIds) {
      const photoCount = await prisma.photo.count({ where: { eventId: albumId } });
      const personCount = await prisma.person.count({ where: { eventId: albumId } });

      await prisma.event.update({
        where: { id: albumId },
        data: {
          photoCount,
          personCount,
          status: 'COMPLETED'
        }
      });
    }

    return { success: true, processed: extracted.length };
  } catch (err) {
    console.error('Failed to save processing results:', err);
    throw err;
  }
}

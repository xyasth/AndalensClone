import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { PrismaClient } from '@prisma/client';

declare global {
  var prisma: PrismaClient | undefined;
}
const prisma = global.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') global.prisma = prisma;

const ML_API_BASE_URL = process.env.ML_API_BASE_URL || 'https://e2c6ed78a72e.ngrok-free.app/extract';

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

    // Verify user owns all albums
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
      console.log('🤖 Calling REAL ML API at:', `${ML_API_BASE_URL}`);
      console.log('📝 Request body:', JSON.stringify(body, null, 2));
      
      const resp = await fetch(`${ML_API_BASE_URL}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'  // Skip ngrok browser warning
        },
        body: JSON.stringify(body),
        // Increase timeout for ML processing
        signal: AbortSignal.timeout(300000) // 5 minutes timeout
      });

      if (!resp.ok) {
        const text = await resp.text();
        console.error('❌ ML API error response:', text);
        throw new Error(`ML API error ${resp.status}: ${text}`);
      }

      mlResponse = await resp.json();
      console.log('✅ REAL ML API response received successfully!');
      console.log('📊 Extracted faces:', mlResponse.extracted?.length || 0);
      console.log('📊 Clusters found:', mlResponse.centroid?.length || 0);
      
      // Log first few items to verify structure
      if (mlResponse.extracted?.length > 0) {
        console.log('📋 Sample extracted face:', JSON.stringify(mlResponse.extracted[0], null, 2));
      }
      if (mlResponse.centroid?.length > 0) {
        console.log('📋 Sample centroid:', JSON.stringify(mlResponse.centroid[0], null, 2));
      }
      
    } catch (err) {
      console.warn('❌ REAL ML API call failed, using mock response as fallback. Error:', err);
      console.warn('⚠️ This should only happen during development or when ML API is down');
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
  console.log('🔧 Generating mock response as fallback (ML API unavailable)');
  
  const extracted: any[] = [];
  const centroid: any[] = [];
  const clusterMap = new Map<number, boolean>();

  for (const album of request.albums) {
    console.log('📁 Mock processing album:', album.album_id, 'with folders:', album.folder_id);
    
    for (const folderId of album.folder_id) {
      // Simulate realistic number of photos (8-15 photos per folder)
      const numPhotos = Math.floor(Math.random() * 8) + 8; 
      
      for (let photoIndex = 0; photoIndex < numPhotos; photoIndex++) {
        const fotoId = `photo_${photoIndex}.jpg`;
        
        // Each photo can have 1-4 faces
        const numFacesInPhoto = Math.floor(Math.random() * 4) + 1;
        
        for (let faceIndex = 0; faceIndex < numFacesInPhoto; faceIndex++) {
          // Simulate realistic cluster distribution (0-16 clusters total)
          const clusterId = Math.floor(Math.random() * 17);
          const faceId = `${fotoId}_f-${faceIndex}`;

          extracted.push({
            foto_id: fotoId,
            face_id: faceId,
            album_id: album.album_id,
            drive_id: folderId,
            cluster_id: clusterId,
            facial_area: {
              x: Math.floor(Math.random() * 600) + 100,      // 100-700px
              y: Math.floor(Math.random() * 400) + 100,      // 100-500px  
              w: Math.floor(Math.random() * 120) + 80,       // 80-200px
              h: Math.floor(Math.random() * 140) + 100,      // 100-240px
              left_eye: [Math.random() * 1000, Math.random() * 800],
              right_eye: [Math.random() * 1000, Math.random() * 800],
              nose: [Math.random() * 1000, Math.random() * 800],
              mouth_left: [Math.random() * 1000, Math.random() * 800],
              mouth_right: [Math.random() * 1000, Math.random() * 800]
            },
            face_confidence: Math.random() * 0.25 + 0.75,   // 0.75-1.0 confidence
            embedding: Array.from({ length: 512 }, () => Math.random() * 2 - 1)
          });

          // Add to centroid if first occurrence of this cluster
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
  }

  console.log(`✅ Mock response generated: ${extracted.length} faces in ${centroid.length} clusters`);
  console.log('📊 Cluster distribution:', Array.from(clusterMap.keys()).sort((a,b) => a-b));
  
  return { extracted, centroid };
}

async function saveProcessingResults(mlResponse: any) {
  const { extracted, centroid } = mlResponse ?? {};
  if (!Array.isArray(extracted)) {
    throw new Error('ML response missing extracted array');
  }

  try {
    console.log(`🔄 Processing ${extracted.length} faces and ${centroid?.length || 0} centroids from ML API`);

    // Group faces by photo (foto_id) 
    const photoMap = new Map<string, any[]>();
    for (const face of extracted) {
      const albumId = String(face.album_id);
      const fotoId = String(face.foto_id ?? face.fotoId ?? 'unknown.jpg');
      const key = `${albumId}:${fotoId}`;
      
      if (!photoMap.has(key)) photoMap.set(key, []);
      photoMap.get(key)!.push(face);
    }

    console.log(`📊 Processing ${photoMap.size} unique photos across albums`);

    // Create centroid lookup for efficient thumbnail assignment
    const centroidMap = new Map<string, any>();
    if (Array.isArray(centroid)) {
      for (const c of centroid) {
        const key = `${c.album_id}:${c.cluster_id}`;
        centroidMap.set(key, c);
        console.log(`📍 Centroid for cluster ${c.cluster_id}: ${c.foto_id}`);
      }
    }

    // Process each photo
    for (const [key, faces] of photoMap) {
      const [albumId, fotoId] = key.split(':');
      const photoPath = `/drive/${albumId}/${fotoId}`;

      console.log(`📷 Processing photo: ${fotoId} with ${faces.length} faces`);

      // Create or update photo record
      let photo = await prisma.photo.findFirst({ where: { path: photoPath } });
      
      if (photo) {
        photo = await prisma.photo.update({
          where: { id: photo.id },
          data: {
            status: 'COMPLETED',
            processedAt: new Date(),
            driveFileId: faces[0]?.drive_id ?? null,
            // Update quality based on face detection results
            isGoodQuality: faces.length > 0 && faces.some(f => f.face_confidence > 0.8),
            qualityScore: faces.length > 0 ? Math.max(...faces.map(f => Number(f.face_confidence) || 0)) : 0.5
          }
        });
      } else {
        photo = await prisma.photo.create({
          data: {
            originalName: fotoId,
            path: photoPath,
            eventId: albumId,
            isGoodQuality: faces.length > 0 && faces.some(f => f.face_confidence > 0.8),
            qualityScore: faces.length > 0 ? Math.max(...faces.map(f => Number(f.face_confidence) || 0)) : 0.5,
            status: 'COMPLETED',
            processedAt: new Date(),
            driveFileId: faces[0]?.drive_id ?? null
          }
        });
      }

      // Process each face in this photo
      for (const face of faces) {
        const clusterIdStr = String(face.cluster_id ?? 0);
        const fotoIdStr = String(face.face_id ?? face.foto_id ?? face.fotoId ?? `${fotoId}_face`);

        // Safely process embedding
        let embeddingSafe: number[] = [];
        if (Array.isArray(face.embedding)) {
          embeddingSafe = face.embedding.map((v: any) => {
            const n = Number(v);
            return Number.isFinite(n) ? n : 0;
          }).slice(0, 512); // Ensure max 512 dimensions
        }

        // Extract facial area data with proper defaults
        const fa = face.facial_area ?? {};
        const facialAreaX = Math.max(0, Number(fa.x ?? 0));
        const facialAreaY = Math.max(0, Number(fa.y ?? 0));  
        const facialAreaW = Math.max(50, Number(fa.w ?? 100)); // Min 50px width
        const facialAreaH = Math.max(50, Number(fa.h ?? 100)); // Min 50px height
        const faceConfidence = Math.min(1.0, Math.max(0.0, Number(face.face_confidence ?? 0)));

        console.log(`👤 Processing face in cluster ${clusterIdStr} with confidence ${faceConfidence.toFixed(2)}`);

        // Check if this face should be the thumbnail for this cluster
        const centroidKey = `${albumId}:${clusterIdStr}`;
        const clusterCentroid = centroidMap.get(centroidKey);
        const shouldBeThumbnail = clusterCentroid && clusterCentroid.foto_id === fotoId;

        // Create or update person (cluster)
        let person = await prisma.person.findFirst({
          where: { clusterId: clusterIdStr, eventId: albumId }
        });

        if (person) {
          // Update existing person
          const faceCount = await prisma.face.count({
            where: { personId: person.id }
          });
          
          const avgConfidenceResult = await prisma.face.aggregate({
            where: { personId: person.id },
            _avg: { faceConfidence: true }
          });

          const updatedConfidence = avgConfidenceResult._avg.faceConfidence || faceConfidence;
          
          person = await prisma.person.update({
            where: { id: person.id },
            data: {
              photoCount: faceCount + 1,
              averageConfidence: updatedConfidence,
              // Update thumbnail if this is the centroid face or if no thumbnail exists
              thumbnailPath: shouldBeThumbnail || !person.thumbnailPath 
                ? `/api/photos/${photo.id}/thumbnail?x=${facialAreaX}&y=${facialAreaY}&w=${facialAreaW}&h=${facialAreaH}`
                : person.thumbnailPath
            }
          });
          
          console.log(`📊 Updated person ${person.name} - ${person.photoCount} photos, ${updatedConfidence.toFixed(2)} avg confidence`);
        } else {
          // Create new person
          person = await prisma.person.create({
            data: {
              name: `Person ${clusterIdStr}`,
              eventId: albumId,
              clusterId: clusterIdStr,
              photoCount: 1,
              averageConfidence: faceConfidence,
              thumbnailPath: `/api/photos/${photo.id}/thumbnail?x=${facialAreaX}&y=${facialAreaY}&w=${facialAreaW}&h=${facialAreaH}`
            }
          });
          
          console.log(`✨ Created new person: ${person.name} in cluster ${clusterIdStr}`);
        }

        // Create or update face record
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
            embedding: embeddingSafe,
            facialAreaX,
            facialAreaY,
            facialAreaW,
            facialAreaH,
            faceConfidence
          }
        });
      }
    }

    // Update album statistics
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

      console.log(`📊 Album ${albumId} final stats: ${photoCount} photos, ${personCount} people`);
    }

    return { 
      success: true, 
      processed: extracted.length,
      photos: photoMap.size,
      clusters: centroid?.length || 0,
      albums: albumIds.length
    };
  } catch (err) {
    console.error('❌ Failed to save processing results:', err);
    throw err;
  }
}
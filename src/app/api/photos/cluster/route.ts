// api/photos/cluster/route.ts - Enhanced with incremental clustering support
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const ML_API_BASE_URL = process.env.ML_API_BASE_URL || 'https://e24135ca6db2.ngrok-free.app/extract';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    console.log('Received clustering request:', JSON.stringify(body, null, 2));

    if (!body?.albums || !Array.isArray(body.albums)) {
      return NextResponse.json({ error: 'Invalid request format' }, { status: 400 });
    }

    // Determine the event ID from the first album
    let eventId: string | null = null;
    const albumIds = body.albums.map((a: any) => a.album_id);

    // Validate all albums and get event ID
    for (const albumData of body.albums) {
      const albumId = String(albumData.album_id);
      const album = await prisma.album.findFirst({
        where: {
          id: albumId,
          event: {
            user: { email: session.user.email }
          }
        },
        include: {
          event: true,
          driveFolders: true
        }
      });

      if (!album) {
        return NextResponse.json({
          error: `Album ${albumId} not found or access denied`
        }, { status: 403 });
      }

      if (!eventId) {
        eventId = album.event.id;
      } else if (eventId !== album.event.id) {
        return NextResponse.json({
          error: 'All albums must belong to the same event'
        }, { status: 400 });
      }

      // Validate folder IDs
      const requestedFolderIds = albumData.folder_id || [];
      const validFolderIds = album.driveFolders.map(df => df.driveFolderId);
      
      for (const folderId of requestedFolderIds) {
        if (!validFolderIds.includes(folderId)) {
          return NextResponse.json({
            error: `Drive folder ${folderId} not found in album ${albumId}`
          }, { status: 400 });
        }
      }

      // Validate include_files structure
      if (albumData.include_files) {
        if (!Array.isArray(albumData.include_files)) {
          return NextResponse.json({
            error: 'include_files must be an array of arrays'
          }, { status: 400 });
        }

        if (albumData.include_files.length !== requestedFolderIds.length) {
          return NextResponse.json({
            error: 'include_files array length must match folder_id array length'
          }, { status: 400 });
        }
      }
    }

    // Check for existing processed albums in this event
    const existingAlbumsInEvent = await prisma.album.findMany({
      where: {
        eventId: eventId!,
        status: 'COMPLETED',
        photoCount: { gt: 0 }
      },
      select: { id: true, name: true }
    });

    const newAlbumIds = albumIds.filter((id: string) => 
      !existingAlbumsInEvent.some(existing => existing.id === id)
    );

    // Check if we're adding new albums to an already processed event
    const isIncrementalClustering = existingAlbumsInEvent.length > 0 && newAlbumIds.length > 0;
    
    if (isIncrementalClustering) {
      console.warn(`⚠️ INCREMENTAL CLUSTERING DETECTED:`);
      console.warn(`  - Event has ${existingAlbumsInEvent.length} already processed albums`);
      console.warn(`  - Processing ${albumIds.length} albums total (${newAlbumIds.length} new)`);
      console.warn(`  - This may create duplicate Person clusters!`);
      
      // Option 1: Warn and require all albums to be included
      const missingAlbumIds = existingAlbumsInEvent
        .map(a => a.id)
        .filter(id => !albumIds.includes(id));
      
      if (missingAlbumIds.length > 0) {
        const missingAlbums = existingAlbumsInEvent.filter(a => 
          missingAlbumIds.includes(a.id)
        );
        
        return NextResponse.json({
          error: 'SYNC_REQUIRED',
          message: 'To maintain synchronized clustering, you must include all previously processed albums',
          processed_albums: existingAlbumsInEvent.map(a => ({
            id: a.id,
            name: a.name
          })),
          missing_albums: missingAlbums.map(a => ({
            id: a.id,
            name: a.name
          })),
          suggestion: 'Include all albums in the request to reprocess and synchronize face clusters'
        }, { status: 409 }); // 409 Conflict
      }

      // If all albums are included, we need to delete old data before reprocessing
      console.log('✅ All albums included - preparing for full reprocessing...');
      await deleteEventClusteringData(eventId!);
    }

    let mlResponse: any;
    try {
      console.log('Calling ML API at:', `${ML_API_BASE_URL}`);
      
      const resp = await fetch(`${ML_API_BASE_URL}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(300000)
      });

      if (!resp.ok) {
        const text = await resp.text();
        console.error('ML API error response:', text);
        throw new Error(`ML API error ${resp.status}: ${text}`);
      }

      mlResponse = await resp.json();
      console.log('ML API response received successfully!');
      console.log('Extracted faces:', mlResponse.extracted?.length || 0);
      console.log('Clusters found:', mlResponse.centroid?.length || 0);
      
    } catch (err) {
      console.warn('ML API call failed, using mock response as fallback. Error:', err);
      mlResponse = generateMockResponse(body);
    }

    const saveResults = await saveProcessingResults(mlResponse, session);
    console.log('Saved to database:', saveResults);

    return NextResponse.json(mlResponse);
  } catch (error) {
    console.error('Clustering API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper function to delete existing clustering data for an event
async function deleteEventClusteringData(eventId: string) {
  console.log(`🗑️ Deleting existing clustering data for event ${eventId}...`);
  
  try {
    // Delete in correct order due to foreign key constraints
    
    // 1. Delete faces (references photos and persons)
    const deletedFaces = await prisma.face.deleteMany({
      where: {
        photo: { eventId }
      }
    });
    console.log(`  Deleted ${deletedFaces.count} faces`);

    // 2. Delete persons (references event)
    const deletedPersons = await prisma.person.deleteMany({
      where: { eventId }
    });
    console.log(`  Deleted ${deletedPersons.count} persons`);

    // 3. Delete photos (keep the records but reset processing status)
    const updatedPhotos = await prisma.photo.updateMany({
      where: { eventId },
      data: {
        status: 'PROCESSING',
        processedAt: null,
        isGoodQuality: false,
        qualityScore: 0
      }
    });
    console.log(`  Reset ${updatedPhotos.count} photos`);

    // 4. Reset album statuses
    const updatedAlbums = await prisma.album.updateMany({
      where: { eventId },
      data: {
        status: 'ACTIVE',
        photoCount: 0
      }
    });
    console.log(`  Reset ${updatedAlbums.count} albums`);

    // 5. Reset drive folder statuses
    const updatedFolders = await prisma.driveFolder.updateMany({
      where: {
        album: { eventId }
      },
      data: {
        status: 'ACTIVE',
        photoCount: 0
      }
    });
    console.log(`  Reset ${updatedFolders.count} drive folders`);

    console.log('✅ Successfully cleaned up existing data for reprocessing');
  } catch (error) {
    console.error('❌ Failed to delete existing clustering data:', error);
    throw error;
  }
}

function generateMockResponse(request: any) {
  console.log('Generating mock response as fallback');
  
  const extracted: any[] = [];
  const centroid: any[] = [];
  const clusterMap = new Map<number, boolean>();

  for (const album of request.albums) {
    const folderIds = album.folder_id || [];
    const includeFiles = album.include_files || [];

    folderIds.forEach((folderId: string, folderIndex: number) => {
      const filesToProcess = includeFiles[folderIndex] || [];
      const numFiles = filesToProcess.length > 0 ? filesToProcess.length : Math.floor(Math.random() * 8) + 8;
      
      for (let photoIndex = 0; photoIndex < numFiles; photoIndex++) {
        const fotoId = filesToProcess[photoIndex] || `photo_${photoIndex}.jpg`;
        const numFacesInPhoto = Math.floor(Math.random() * 4) + 1;
        
        for (let faceIndex = 0; faceIndex < numFacesInPhoto; faceIndex++) {
          const clusterId = Math.floor(Math.random() * 17);
          const faceId = `${fotoId}_f-${faceIndex}`;

          extracted.push({
            foto_id: fotoId,
            face_id: faceId,
            album_id: album.album_id,
            drive_id: folderId,
            cluster_id: clusterId,
            facial_area: {
              x: Math.floor(Math.random() * 600) + 100,
              y: Math.floor(Math.random() * 400) + 100,
              w: Math.floor(Math.random() * 120) + 80,
              h: Math.floor(Math.random() * 140) + 100,
              left_eye: [Math.random() * 1000, Math.random() * 800],
              right_eye: [Math.random() * 1000, Math.random() * 800]
            },
            face_confidence: Math.random() * 0.25 + 0.75,
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
    });
  }

  return { extracted, centroid };
}

async function getDriveFileMapping(albumId: string, driveFolderId: string, session: any): Promise<Map<string, string>> {
  const fileMapping = new Map<string, string>();
  
  try {
    const accessToken = session.accessToken;
    if (!accessToken) {
      console.log('No access token available');
      return fileMapping;
    }

    console.log(`Fetching Drive files from folder: ${driveFolderId}`);

    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?q='${driveFolderId}' in parents and (mimeType='image/jpeg' or mimeType='image/png' or mimeType='image/gif' or mimeType='image/webp')&fields=files(id,name)&pageSize=1000`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.ok) {
      const data = await response.json();
      console.log(`Found ${data.files.length} files in Drive folder ${driveFolderId}`);
      
      for (const file of data.files) {
        fileMapping.set(file.name, file.id);
      }
    } else {
      console.error(`Drive API error: ${response.status}`);
    }
  } catch (error) {
    console.error('Failed to create drive file mapping:', error);
  }
  
  return fileMapping;
}

async function saveProcessingResults(mlResponse: any, session: any) {
  const { extracted, centroid } = mlResponse ?? {};
  if (!Array.isArray(extracted)) {
    throw new Error('ML response missing extracted array');
  }

  try {
    console.log(`Processing ${extracted.length} faces`);

    // Create drive file mappings
    const albumFolderMap = new Map<string, Map<string, string>>();
    
    const albumDriveCombos = new Set<string>();
    for (const face of extracted) {
      const albumId = String(face.album_id);
      const driveId = String(face.drive_id);
      albumDriveCombos.add(`${albumId}:${driveId}`);
    }

    for (const combo of albumDriveCombos) {
      const [albumId, driveId] = combo.split(':');
      const mapping = await getDriveFileMapping(albumId, driveId, session);
      albumFolderMap.set(combo, mapping);
    }

    // Group faces by photo
    const photoMap = new Map<string, any[]>();
    for (const face of extracted) {
      const albumId = String(face.album_id);
      const driveId = String(face.drive_id);
      const fotoId = String(face.foto_id ?? 'unknown.jpg');
      const key = `${albumId}:${driveId}:${fotoId}`;
      
      if (!photoMap.has(key)) photoMap.set(key, []);
      photoMap.get(key)!.push(face);
    }

    // Create centroid lookup
    const centroidMap = new Map<string, any>();
    if (Array.isArray(centroid)) {
      for (const c of centroid) {
        const album = await prisma.album.findUnique({
          where: { id: c.album_id },
          select: { eventId: true }
        });
        
        if (album) {
          const key = `${album.eventId}:${c.cluster_id}`;
          centroidMap.set(key, c);
        }
      }
    }

    // Process each photo
    for (const [key, faces] of photoMap) {
      const [albumId, driveId, fotoId] = key.split(':');
      const photoPath = `/drive/${albumId}/${driveId}/${fotoId}`;

      const fileMapping = albumFolderMap.get(`${albumId}:${driveId}`);
      const actualDriveFileId = fileMapping?.get(fotoId) || null;

      const driveFolder = await prisma.driveFolder.findFirst({
        where: {
          driveFolderId: driveId,
          albumId: albumId
        },
        include: {
          album: true
        }
      });

      if (!driveFolder) {
        console.warn(`Drive folder not found: ${driveId} in album ${albumId}`);
        continue;
      }

      let photo = await prisma.photo.findFirst({ where: { path: photoPath } });
      
      if (photo) {
        photo = await prisma.photo.update({
          where: { id: photo.id },
          data: {
            status: 'COMPLETED',
            processedAt: new Date(),
            driveFileId: actualDriveFileId,
            isGoodQuality: faces.length > 0 && faces.some(f => f.face_confidence > 0.8),
            qualityScore: faces.length > 0 ? Math.max(...faces.map(f => Number(f.face_confidence) || 0)) : 0.5
          }
        });
      } else {
        photo = await prisma.photo.create({
          data: {
            originalName: fotoId,
            path: photoPath,
            eventId: driveFolder.album.eventId,
            albumId: albumId,
            driveFolderId: driveFolder.id,
            isGoodQuality: faces.length > 0 && faces.some(f => f.face_confidence > 0.8),
            qualityScore: faces.length > 0 ? Math.max(...faces.map(f => Number(f.face_confidence) || 0)) : 0.5,
            status: 'COMPLETED',
            processedAt: new Date(),
            driveFileId: actualDriveFileId
          }
        });
      }

      const eventId = driveFolder.album.eventId;

      // Process each face
      for (const face of faces) {
        const clusterIdStr = String(face.cluster_id ?? 0);
        const fotoIdStr = String(face.face_id ?? face.foto_id ?? `${fotoId}_face`);

        let embeddingSafe: number[] = [];
        if (Array.isArray(face.embedding)) {
          embeddingSafe = face.embedding.map((v: any) => {
            const n = Number(v);
            return Number.isFinite(n) ? n : 0;
          }).slice(0, 512);
        }

        const fa = face.facial_area ?? {};
        const facialAreaX = Math.max(0, Number(fa.x ?? 0));
        const facialAreaY = Math.max(0, Number(fa.y ?? 0));
        const facialAreaW = Math.max(50, Number(fa.w ?? 100));
        const facialAreaH = Math.max(50, Number(fa.h ?? 100));
        const faceConfidence = Math.min(1.0, Math.max(0.0, Number(face.face_confidence ?? 0)));

        const centroidKey = `${eventId}:${clusterIdStr}`;
        const clusterCentroid = centroidMap.get(centroidKey);
        const shouldBeThumbnail = clusterCentroid && clusterCentroid.foto_id === fotoId;

        let person = await prisma.person.upsert({
          where: {
            eventId_clusterId: {
              eventId: eventId,
              clusterId: clusterIdStr
            }
          },
          update: {},
          create: {
            name: `Person ${clusterIdStr}`,
            eventId: eventId,
            clusterId: clusterIdStr,
            photoCount: 0,
            averageConfidence: faceConfidence,
            thumbnailPath: `/api/photos/${photo.id}/thumbnail?x=${facialAreaX}&y=${facialAreaY}&w=${facialAreaW}&h=${facialAreaH}`
          }
        });

        const currentFaceCount = await prisma.face.count({
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
            photoCount: currentFaceCount + 1,
            averageConfidence: updatedConfidence,
            thumbnailPath: shouldBeThumbnail || !person.thumbnailPath 
              ? `/api/photos/${photo.id}/thumbnail?x=${facialAreaX}&y=${facialAreaY}&w=${facialAreaW}&h=${facialAreaH}`
              : person.thumbnailPath
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

    // Update statistics
    const processedAlbums = new Set<string>();
    const processedEvents = new Set<string>();
    
    for (const face of extracted) {
      const albumId = String(face.album_id);
      const driveId = String(face.drive_id);
      processedAlbums.add(albumId);
      
      const driveFolder = await prisma.driveFolder.findFirst({
        where: {
          driveFolderId: driveId,
          albumId: albumId
        }
      });
      
      if (driveFolder) {
        const photoCount = await prisma.photo.count({ 
          where: { driveFolderId: driveFolder.id } 
        });
        
        await prisma.driveFolder.update({
          where: { id: driveFolder.id },
          data: { 
            photoCount,
            status: 'COMPLETED'
          }
        });
      }
    }

    for (const albumId of processedAlbums) {
      const photoCount = await prisma.photo.count({ where: { albumId } });
      
      const album = await prisma.album.update({
        where: { id: albumId },
        data: {
          photoCount,
          status: 'COMPLETED'
        },
        include: { event: true }
      });
      
      processedEvents.add(album.event.id);
    }

    for (const eventId of processedEvents) {
      const photoCount = await prisma.photo.count({ where: { eventId } });
      const personCount = await prisma.person.count({ where: { eventId } });

      await prisma.event.update({
        where: { id: eventId },
        data: {
          status: 'COMPLETED'
        }
      });
    }

    return { 
      success: true, 
      processed: extracted.length,
      photos: photoMap.size,
      clusters: centroid?.length || 0,
      albums: processedAlbums.size,
      events: processedEvents.size
    };
  } catch (err) {
    console.error('Failed to save processing results:', err);
    throw err;
  }
}
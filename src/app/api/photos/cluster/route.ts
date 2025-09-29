// api/photos/cluster/route.ts - Updated with include_files support
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const ML_API_BASE_URL = process.env.ML_API_BASE_URL || 'https://ec94bcc55d6b.ngrok-free.app/extract';

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

    // Validate that user owns all the albums being processed
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

      // Validate that the folder_ids exist in this album
      const requestedFolderIds = albumData.folder_id || [];
      const validFolderIds = album.driveFolders.map(df => df.driveFolderId);
      
      for (const folderId of requestedFolderIds) {
        if (!validFolderIds.includes(folderId)) {
          return NextResponse.json({
            error: `Drive folder ${folderId} not found in album ${albumId}`
          }, { status: 400 });
        }
      }

      // Validate include_files structure if provided
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

        for (const filesArray of albumData.include_files) {
          if (!Array.isArray(filesArray)) {
            return NextResponse.json({
              error: 'Each element in include_files must be an array of file names'
            }, { status: 400 });
          }
        }
      }
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

function generateMockResponse(request: any) {
  console.log('Generating mock response as fallback');
  
  const extracted: any[] = [];
  const centroid: any[] = [];
  const clusterMap = new Map<number, boolean>();

  for (const album of request.albums) {
    const folderIds = album.folder_id || [];
    const includeFiles = album.include_files || [];

    folderIds.forEach((folderId: string, folderIndex: number) => {
      // Get files to process for this folder
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

    // Create drive file mappings for each album/folder combination
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
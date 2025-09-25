// api/albums/[albumId]/drive-folders/route.ts - Manage drive folders in an album
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function extractFolderId(driveLink: string): string {
  if (!driveLink) return '';
  const match = driveLink.match(/\/folders\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : '';
}

export async function GET(
  request: NextRequest,
  { params }: { params: { albumId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { albumId } = await params;

    // Verify user owns this album
    const album = await prisma.album.findFirst({
      where: {
        id: albumId,
        event: {
          user: { email: session.user.email }
        }
      },
      include: {
        driveFolders: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!album) {
      return NextResponse.json({ error: 'Album not found or access denied' }, { status: 403 });
    }

    const driveFolders = album.driveFolders.map(folder => ({
      id: folder.id,
      name: folder.name,
      driveLink: folder.driveLink,
      driveFolderId: folder.driveFolderId,
      photoCount: folder.photoCount,
      status: folder.status.toLowerCase(),
      createdAt: folder.createdAt.toISOString(),
      updatedAt: folder.updatedAt.toISOString()
    }));

    return NextResponse.json(driveFolders);
  } catch (error) {
    console.error('Failed to fetch drive folders:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { albumId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { albumId } = await params;
    const { name, driveLink } = await request.json();

    if (!name || !driveLink) {
      return NextResponse.json({ error: 'Name and drive link are required' }, { status: 400 });
    }

    // Verify user owns this album
    const album = await prisma.album.findFirst({
      where: {
        id: albumId,
        event: {
          user: { email: session.user.email }
        }
      }
    });

    if (!album) {
      return NextResponse.json({ error: 'Album not found or access denied' }, { status: 403 });
    }

    const driveFolderId = extractFolderId(driveLink);
    if (!driveFolderId) {
      return NextResponse.json({ error: 'Invalid Google Drive link' }, { status: 400 });
    }

    // Create drive folder
    const driveFolder = await prisma.driveFolder.create({
      data: {
        name,
        driveLink,
        driveFolderId,
        albumId,
        status: 'ACTIVE'
      }
    });

    const responseDriveFolder = {
      id: driveFolder.id,
      name: driveFolder.name,
      driveLink: driveFolder.driveLink,
      driveFolderId: driveFolder.driveFolderId,
      photoCount: driveFolder.photoCount,
      status: driveFolder.status.toLowerCase(),
      createdAt: driveFolder.createdAt.toISOString(),
      updatedAt: driveFolder.updatedAt.toISOString()
    };

    return NextResponse.json(responseDriveFolder, { status: 201 });
  } catch (error) {
    console.error('Failed to create drive folder:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
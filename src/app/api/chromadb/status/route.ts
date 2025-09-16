import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { chromaDB } from '@/lib/chromadb';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');

    const isHealthy = await chromaDB.healthCheck();
    const collections = await chromaDB.listCollections();
    
    let eventStats = null;
    if (eventId) {
      eventStats = await chromaDB.getCollectionStats(eventId);
    }

    return NextResponse.json({
      success: true,
      data: {
        isHealthy,
        collections,
        eventStats
      }
    });
  } catch (error) {
    console.error('ChromaDB status error:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Failed to get ChromaDB status' 
    }, { status: 500 });
  }
}
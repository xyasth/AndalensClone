import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { chromaDB } from '@/lib/chromadb';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { eventId } = await request.json();
    
    if (!eventId) {
      return NextResponse.json({ error: 'Event ID is required' }, { status: 400 });
    }

    const collection = await chromaDB.initializeEventCollection(eventId);
    
    return NextResponse.json({
      success: true,
      message: 'ChromaDB collection initialized successfully',
      collectionName: collection.name
    });
  } catch (error) {
    console.error('ChromaDB initialization error:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Failed to initialize ChromaDB collection' 
    }, { status: 500 });
  }
}
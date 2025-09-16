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

    const { eventId, embedding, nResults = 10, threshold = 0.8 } = await request.json();
    
    if (!eventId || !embedding) {
      return NextResponse.json({ 
        error: 'Event ID and embedding are required' 
      }, { status: 400 });
    }

    const results = await chromaDB.querySimilarFaces(
      eventId,
      embedding,
      nResults,
      threshold
    );
    
    return NextResponse.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('ChromaDB query error:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Failed to query ChromaDB' 
    }, { status: 500 });
  }
}
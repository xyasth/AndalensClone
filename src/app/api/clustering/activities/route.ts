import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    // In real implementation:
    // const activities = await getRecentActivitiesFromDatabase();
    
    const activities = [
      {
        id: 'activity-1',
        type: 'clustering',
        status: 'completed',
        eventId: 'event-1',
        eventName: 'Birthday Party 2024',
        photoName: 'family_photo_001.jpg',
        facesDetected: 4,
        clustersCreated: 2,
        timestamp: new Date(Date.now() - 30000)
      }
    ];
    
    return NextResponse.json(activities);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch activities' }, { status: 500 });
  }
}
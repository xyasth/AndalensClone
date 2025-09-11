import { NextRequest, NextResponse } from 'next/server';

// GET /api/events
export async function GET() {
  try {
    // In real implementation:
    // const events = await fetchEventsFromDatabase();

    // For now, return dummy data
    const events = [
      {
        id: 'event-1',
        name: 'Birthday Party 2024',
        description: 'Joren\'s amazing birthday celebration',
        createdAt: '2024-03-15T10:00:00Z',
        photoCount: 45,
        personCount: 8,
        status: 'completed'
      }
    ];

    return NextResponse.json(events);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
}

// POST /api/events
export async function POST(request: NextRequest) {
  try {
    const { name, description } = await request.json();

    // In real implementation:
    // const event = await createEventInDatabase({ name, description });

    const newEvent = {
      id: `event-${Date.now()}`,
      name,
      description,
      createdAt: new Date().toISOString(),
      photoCount: 0,
      personCount: 0,
      status: 'active' as const
    };

    return NextResponse.json(newEvent);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
  }
}
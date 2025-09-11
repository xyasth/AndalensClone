import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const { eventId } = params;
    
    // In real implementation:
    // const event = await fetchEventById(eventId);
    
    return NextResponse.json({ id: eventId, name: 'Sample Event' });
  } catch (error) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  }
}
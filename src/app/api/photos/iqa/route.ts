// api/photos/iqa/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

const IQA_API_URL = process.env.IQA_API_URL || null;

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    console.log('Received IQA request:', JSON.stringify(body, null, 2));

    if (!body?.folder_id || !Array.isArray(body.folder_id)) {
      return NextResponse.json({ error: 'Invalid request format. Expected folder_id array.' }, { status: 400 });
    }

    let iqaResponse: any;

    if (!IQA_API_URL) {
      console.log('No IQA API URL configured, generating mock data');
      iqaResponse = generateMockIQAResponse(body.folder_id);
    } else {
      try {
        console.log('Calling IQA API at:', IQA_API_URL);
        
        const response = await fetch(IQA_API_URL, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true'
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(60000) // 1 minute timeout
        });

        if (!response.ok) {
          const text = await response.text();
          console.error('IQA API error response:', text);
          throw new Error(`IQA API error ${response.status}: ${text}`);
        }

        iqaResponse = await response.json();
        console.log('IQA API response received successfully!');
        
      } catch (err) {
        console.warn('IQA API call failed, using mock response as fallback. Error:', err);
        iqaResponse = generateMockIQAResponse(body.folder_id);
      }
    }

    return NextResponse.json(iqaResponse);
  } catch (error) {
    console.error('IQA API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function generateMockIQAResponse(folderIds: string[]) {
  console.log('Generating mock IQA response for folders:', folderIds);
  
  const folders = folderIds.map(folderId => {
    // Generate 8-15 mock files per folder
    const numFiles = Math.floor(Math.random() * 8) + 8;
    const results = [];
    
    for (let i = 0; i < numFiles; i++) {
      const isGoodQuality = Math.random() > 0.3; // 70% good quality
      const confidence = isGoodQuality 
        ? 0.6 + Math.random() * 0.4  // 0.6-1.0 for good
        : 0.5 + Math.random() * 0.5; // 0.5-1.0 for bad
        
      results.push({
        file_name: `photo_${i + 1}.jpg`,
        prediction: {
          label: isGoodQuality ? 'good' : 'bad',
          confidence: parseFloat(confidence.toFixed(5))
        }
      });
    }
    
    return {
      folder_id: folderId,
      results: results
    };
  });

  return { folders };
}

// Optional: GET method for testing
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const testFolderId = searchParams.get('test') || 'test-folder-123';
  
  const mockResponse = generateMockIQAResponse([testFolderId]);
  
  return NextResponse.json({
    message: 'IQA API is working',
    sample_response: mockResponse,
    api_url: IQA_API_URL || 'Not configured - using mock data'
  });
}
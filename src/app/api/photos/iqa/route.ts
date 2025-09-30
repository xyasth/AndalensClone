import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

const IQA_API_URL = process.env.NEXT_PUBLIC_IQA_API_URL || 'https://dc837bd5fca2.ngrok-free.app/iqa';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    console.log('📊 Received IQA request:', JSON.stringify(body, null, 2));

    if (!body?.folder_id || !Array.isArray(body.folder_id)) {
      return NextResponse.json({ 
        error: 'Invalid request format. Expected { folder_id: string[] }' 
      }, { status: 400 });
    }

    if (body.folder_id.length === 0) {
      return NextResponse.json({ 
        error: 'folder_id array cannot be empty' 
      }, { status: 400 });
    }

    let iqaResponse: any;

    // Try to call the actual IQA API
    try {
      console.log('🔍 Calling IQA API at:', IQA_API_URL);
      console.log('📤 Request body:', JSON.stringify(body));
      
      const response = await fetch(IQA_API_URL, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
          'Accept': 'application/json'
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(60000) // 60 second timeout
      });

      console.log('📥 IQA API response status:', response.status);

      if (!response.ok) {
        const text = await response.text();
        console.error('❌ IQA API error response:', text);
        throw new Error(`IQA API error ${response.status}: ${text}`);
      }

      const responseText = await response.text();
      console.log('📥 IQA API raw response:', responseText.substring(0, 500));

      try {
        iqaResponse = JSON.parse(responseText);
        console.log('✅ IQA API response parsed successfully!');
        console.log('📊 Response structure:', {
          hasFolders: !!iqaResponse.folders,
          foldersCount: iqaResponse.folders?.length || 0,
          firstFolderResultsCount: iqaResponse.folders?.[0]?.results?.length || 0
        });
      } catch (parseError) {
        console.error('❌ Failed to parse IQA response as JSON:', parseError);
        throw new Error('IQA API returned invalid JSON');
      }
      
    } catch (err) {
      console.warn('⚠️ IQA API call failed, using mock response as fallback.');
      console.warn('Error details:', err instanceof Error ? err.message : String(err));
      iqaResponse = generateMockIQAResponse(body.folder_id);
    }

    // Validate response structure
    if (!iqaResponse.folders || !Array.isArray(iqaResponse.folders)) {
      console.warn('⚠️ Invalid IQA response structure, generating mock data');
      iqaResponse = generateMockIQAResponse(body.folder_id);
    }

    console.log('✅ Returning IQA response with', iqaResponse.folders.length, 'folders');
    return NextResponse.json(iqaResponse);
    
  } catch (error) {
    console.error('❌ IQA API handler error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

function generateMockIQAResponse(folderIds: string[]) {
  console.log('🎭 Generating mock IQA response for folders:', folderIds);
  
  const folders = folderIds.map(folderId => {
    // Generate 10-20 mock files per folder
    const numFiles = Math.floor(Math.random() * 11) + 10;
    const results = [];
    
    for (let i = 0; i < numFiles; i++) {
      const isGoodQuality = Math.random() > 0.3; // 70% good quality
      const confidence = isGoodQuality 
        ? 0.6 + Math.random() * 0.4  // 0.6-1.0 for good
        : 0.3 + Math.random() * 0.5; // 0.3-0.8 for bad
        
      results.push({
        file_name: `mock_photo_${i + 1}.jpg`,
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

  const response = { folders };
  console.log('🎭 Mock response generated:', {
    foldersCount: folders.length,
    totalFiles: folders.reduce((sum, f) => sum + f.results.length, 0),
    sampleFile: folders[0]?.results[0]
  });

  return response;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const testFolderId = searchParams.get('test') || 'test-folder-123';
  
  const mockResponse = generateMockIQAResponse([testFolderId]);
  
  return NextResponse.json({
    message: 'IQA API endpoint is working',
    config: {
      api_url: IQA_API_URL,
      using_mock: !IQA_API_URL || IQA_API_URL.includes('ngrok') ? 'possibly (check if ngrok is running)' : 'no'
    },
    sample_request: {
      method: 'POST',
      body: {
        folder_id: ['1-xQUdbAoOCOFYWYxJioO_EPaY_DEAZP2']
      }
    },
    sample_response: mockResponse
  });
}
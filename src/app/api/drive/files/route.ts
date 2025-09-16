import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.error === "RefreshAccessTokenError") {
      return NextResponse.json({ error: 'Access token expired. Please sign in again.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const folderId = searchParams.get('folderId');

    if (!folderId) {
      return NextResponse.json({ error: 'Folder ID is required' }, { status: 400 });
    }

    const accessToken = session.accessToken;
    
    if (!accessToken) {
      return NextResponse.json({ error: 'No access token available' }, { status: 401 });
    }

    console.log('Making request to Drive API with token:', accessToken.substring(0, 20) + '...');

    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?q='${folderId}' in parents and (mimeType='image/jpeg' or mimeType='image/png' or mimeType='image/gif' or mimeType='image/webp')&fields=files(id,name,mimeType,size,webViewLink,thumbnailLink)&orderBy=name`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Drive API error:', error);
      
      if (response.status === 401 || response.status === 403) {
        return NextResponse.json({ error: 'Access token expired or insufficient permissions. Please sign in again.' }, { status: 401 });
      }
      
      return NextResponse.json({ error: 'Failed to fetch files from Google Drive' }, { status: response.status });
    }

    const data = await response.json();
    
    const files = data.files.map((file: any) => ({
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      size: formatFileSize(parseInt(file.size) || 0),
      webViewLink: file.webViewLink,
      thumbnailLink: file.thumbnailLink
    }));

    console.log(`Successfully fetched ${files.length} files from Drive folder ${folderId}`);

    return NextResponse.json(files);
  } catch (error) {
    console.error('Failed to fetch Drive files:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
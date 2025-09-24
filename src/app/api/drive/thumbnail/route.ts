// Create this file: api/drive/thumbnail/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('fileId');
    const size = searchParams.get('size') || '400';

    if (!fileId) {
      return NextResponse.json({ error: 'File ID is required' }, { status: 400 });
    }

    const accessToken = (session as any).accessToken;
    
    if (!accessToken) {
      return NextResponse.json({ error: 'No access token available' }, { status: 401 });
    }

    console.log('📸 Fetching Drive thumbnail for file:', fileId);

    // Try to get thumbnail using Drive API
    const thumbnailResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&sz=w${size}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (thumbnailResponse.ok) {
      const imageBuffer = await thumbnailResponse.arrayBuffer();
      
      return new Response(imageBuffer, {
        headers: {
          'Content-Type': 'image/jpeg',
          'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Fallback: Try to get file metadata to extract thumbnail link
    const metadataResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?fields=thumbnailLink,mimeType`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (metadataResponse.ok) {
      const metadata = await metadataResponse.json();
      
      if (metadata.thumbnailLink) {
        // Proxy the thumbnail through our server to avoid CORS issues
        const directThumbnailResponse = await fetch(`${metadata.thumbnailLink}=s${size}`);
        
        if (directThumbnailResponse.ok) {
          const imageBuffer = await directThumbnailResponse.arrayBuffer();
          
          return new Response(imageBuffer, {
            headers: {
              'Content-Type': 'image/jpeg',
              'Cache-Control': 'public, max-age=3600',
              'Access-Control-Allow-Origin': '*',
            },
          });
        }
      }
    }

    // Ultimate fallback: Return a placeholder image
    const placeholderSvg = `
      <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
        <rect width="200" height="200" fill="#f3f4f6"/>
        <path d="M60 70h80v60H60z" fill="#d1d5db"/>
        <circle cx="80" cy="90" r="6" fill="#6b7280"/>
        <path d="m70 120 10-10 6 6 14-14 20 20v8H70z" fill="#6b7280"/>
      </svg>
    `;

    return new Response(placeholderSvg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=3600',
      },
    });

  } catch (error) {
    console.error('Failed to fetch Drive thumbnail:', error);
    
    // Return placeholder on error
    const placeholderSvg = `
      <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
        <rect width="200" height="200" fill="#f3f4f6"/>
        <path d="M60 70h80v60H60z" fill="#d1d5db"/>
        <circle cx="80" cy="90" r="6" fill="#6b7280"/>
        <path d="m70 120 10-10 6 6 14-14 20 20v8H70z" fill="#6b7280"/>
      </svg>
    `;

    return new Response(placeholderSvg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=300', // Shorter cache for errors
      },
    });
  }
}
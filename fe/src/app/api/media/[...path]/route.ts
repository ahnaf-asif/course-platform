import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const MEDIA_SERVER_URL = process.env.MEDIA_API_URL || 'http://localhost:8081/api/v1';
const API_KEY = process.env.MEDIA_SERVER_API_KEY || '';

async function handle(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const targetPath = path.join('/');
  const query = req.nextUrl.search;
  
  const url = `${MEDIA_SERVER_URL}/${targetPath}${query}`;
  
  console.log(`[Media Proxy] ${req.method} ${url}`);

  try {
    const headers = new Headers();
    // Forward relevant headers
    if (req.headers.get('content-type')) {
      headers.set('content-type', req.headers.get('content-type')!);
    }
    
    // INJECT SECRET KEY (SERVER-SIDE ONLY)
    headers.set('X-API-KEY', API_KEY);

    const response = await fetch(url, {
      method: req.method,
      headers: headers,
      body: req.method === 'POST' || req.method === 'PUT' ? req.body : undefined,
      // @ts-expect-error - duplex is needed for streaming bodies in some node versions
      duplex: 'half',
    });

    // Stream the response back
    return new NextResponse(response.body, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/json',
      },
    });
  } catch (error) {
    console.error('[Media Proxy Error]:', error);
    return NextResponse.json({ message: 'Media server proxy error', error: String(error) }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const DELETE = handle;
export const HEAD = handle;
export const PATCH = handle;

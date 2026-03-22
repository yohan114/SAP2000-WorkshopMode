import { NextRequest, NextResponse } from 'next/server';
import { createReadStream, existsSync, statSync } from 'fs';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathArray } = await params;
    
    if (!pathArray || pathArray.length === 0) {
      return new NextResponse('File not found', { status: 404 });
    }

    // Secure the path to prevent directory traversal
    const safePath = pathArray.join('/').replace(/\.\./g, '');
    const absolutePath = path.join(process.cwd(), 'public', 'uploads', safePath);

    // Check if file exists
    if (!existsSync(absolutePath)) {
      return new NextResponse('File not found', { status: 404 });
    }

    // Get file stats
    const stats = statSync(absolutePath);
    
    if (!stats.isFile()) {
      return new NextResponse('File not found', { status: 404 });
    }

    // Determine content type based on extension
    const ext = path.extname(absolutePath).toLowerCase();
    let contentType = 'application/octet-stream';
    if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
    else if (ext === '.png') contentType = 'image/png';
    else if (ext === '.gif') contentType = 'image/gif';
    else if (ext === '.webp') contentType = 'image/webp';
    else if (ext === '.svg') contentType = 'image/svg+xml';
    else if (ext === '.pdf') contentType = 'application/pdf';

    // To use createReadStream with NextResponse, we use the Web ReadableStream API
    // A simple hack is to pass the stream to the constructor, but in Next.js App Router
    // we use Node.js ReadStream mapped to Web Stream or simply fetch the buffer
    
    // For images, loading buffer into memory is fast enough for development
    // In production, you'd use a cloud provider instead of local filesystem
    const fs = await import('fs/promises');
    const fileBuffer = await fs.readFile(absolutePath);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': stats.size.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Error serving file:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

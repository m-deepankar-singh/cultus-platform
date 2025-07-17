import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { generateCacheHeaders, SimpleCacheConfig } from './simple-cache';

export function generateETag(data: any): string {
  const hash = crypto.createHash('md5');
  hash.update(JSON.stringify(data));
  return `"${hash.digest('hex')}"`;
}

export function checkETagMatch(request: Request, etag: string): boolean {
  const ifNoneMatch = request.headers.get('If-None-Match');
  return ifNoneMatch === etag;
}

// Helper to create cached response
export function createCachedResponse(
  data: any,
  config: SimpleCacheConfig,
  etag?: string
): Response {
  const headers = generateCacheHeaders(config);
  
  if (etag) {
    headers['ETag'] = etag;
  }
  
  return NextResponse.json(data, { headers });
}

// Helper to handle conditional requests
export function handleConditionalRequest(
  request: Request,
  data: any,
  config: SimpleCacheConfig
): Response {
  const etag = generateETag(data);
  
  // Check if client has current version
  if (checkETagMatch(request, etag)) {
    return new Response(null, { status: 304 });
  }
  
  return createCachedResponse(data, config, etag);
}
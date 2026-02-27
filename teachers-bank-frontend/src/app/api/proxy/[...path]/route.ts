// src/app/api/proxy/route.ts
// Next.js API route that proxies all requests to the PHP backend.
// This eliminates CORS issues entirely — the browser talks to Next.js (same origin),
// and Next.js server-to-server calls the PHP API.

import { NextRequest, NextResponse } from 'next/server';

const PHP_BASE = process.env.PHP_API_BASE || 'http://localhost/teachersbank/teachers-bank-api/index.php';

async function handler(req: NextRequest) {
  // Extract the path after /api/proxy  e.g. /api/proxy/api/teachers/1
  const url = new URL(req.url);
  const proxyPath = url.pathname.replace(/^\/api\/proxy/, ''); // → /api/teachers/1
  const search    = url.search; // → ?page=1&limit=20

  // Build the PHP URL using PATH_INFO style
  const phpUrl = `${PHP_BASE}${proxyPath}${search}`;

  // Forward the request to PHP
  const init: RequestInit = {
    method: req.method,
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
  };

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    const body = await req.text();
    if (body) init.body = body;
  }

  try {
    const phpRes = await fetch(phpUrl, init);
    const data   = await phpRes.json();
    return NextResponse.json(data, { status: phpRes.status });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: `Proxy error: ${err.message}`, phpUrl },
      { status: 502 }
    );
  }
}

export const GET    = handler;
export const POST   = handler;
export const PUT    = handler;
export const DELETE = handler;
export const OPTIONS = handler;
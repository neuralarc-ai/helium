import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.arrayBuffer();
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      if (!['host', 'content-length', 'transfer-encoding', 'connection'].includes(key.toLowerCase())) {
        headers[key] = value;
      }
    });
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
    const targetUrl = `${backendUrl}/triggers/qstash/webhook`;
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': headers['content-type'] || 'application/json',
      },
      body: body,
    });
    const responseData = await response.text();
    return new NextResponse(responseData, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/json',
      },
    });
  } catch (error) {
    console.error('[QStash Webhook Proxy] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({ status: 'ok', service: 'qstash-webhook-proxy' });
} 
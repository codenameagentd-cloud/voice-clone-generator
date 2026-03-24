import { NextRequest, NextResponse } from 'next/server';

const XTTS_URL = process.env.XTTS_URL || 'http://localhost:8321';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { voiceId, text, speed, language } = body;

    if (!text) {
      return NextResponse.json({ error: 'text is required' }, { status: 400 });
    }

    const payload = {
      voiceId: voiceId || 'david-default',
      voice_id: voiceId || 'david-default',
      text,
      speed: speed ?? 1.0,
      language: language || 'zh-cn',
    };

    // Try Lisa's endpoint, fallback to mine
    let res = await fetch(`${XTTS_URL}/api/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => null);

    if (!res || !res.ok) {
      res = await fetch(`${XTTS_URL}/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    }

    const contentType = res.headers.get('content-type') || '';

    if (contentType.includes('audio/')) {
      // Lisa's server returns raw audio
      const arrayBuffer = await res.arrayBuffer();
      const b64 = Buffer.from(arrayBuffer).toString('base64');
      const audioUrl = `data:audio/wav;base64,${b64}`;
      return NextResponse.json({ audioUrl, format: 'wav', status: 'done' });
    }

    // My server returns JSON with audioUrl
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Generation failed');
    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

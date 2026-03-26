import { NextRequest, NextResponse } from 'next/server';

const XTTS_URL = process.env.XTTS_URL || 'http://localhost:8321';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { voiceId, text, speed, language, temperature, top_p, top_k, repetition_penalty, gpt_cond_len } = body;

    if (!text) {
      return NextResponse.json({ error: 'text is required' }, { status: 400 });
    }

    const payload = {
      voiceId: voiceId || 'david-default',
      voice_id: voiceId || 'david-default',
      text,
      speed: speed ?? 1.0,
      language: language || 'en',
      temperature: temperature ?? 0.85,
      top_p: top_p ?? 0.85,
      top_k: top_k ?? 50,
      repetition_penalty: repetition_penalty ?? 2.0,
      gpt_cond_len: gpt_cond_len ?? 12,
    };

    // Try XTTS endpoints
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

    // If XTTS returns raw audio, pass it through as binary
    if (contentType.includes('audio/')) {
      const arrayBuffer = await res.arrayBuffer();
      return new NextResponse(arrayBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'audio/wav',
          'Content-Length': String(arrayBuffer.byteLength),
        },
      });
    }

    // XTTS returns JSON with base64 audioUrl — extract and return binary
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Generation failed');

    if (data.audioUrl && data.audioUrl.startsWith('data:audio/')) {
      const b64 = data.audioUrl.split(',')[1];
      const buf = Buffer.from(b64, 'base64');
      return new NextResponse(buf, {
        status: 200,
        headers: {
          'Content-Type': 'audio/wav',
          'Content-Length': String(buf.byteLength),
        },
      });
    }

    // Fallback: return JSON as-is
    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

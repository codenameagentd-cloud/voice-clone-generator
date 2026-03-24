import { NextRequest, NextResponse } from 'next/server';

const XTTS_URL = process.env.XTTS_URL || 'http://localhost:8321';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { voiceId, text, speed, language } = body;

    if (!text) {
      return NextResponse.json({ error: 'text is required' }, { status: 400 });
    }

    const res = await fetch(`${XTTS_URL}/preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        voiceId: voiceId || 'david-default',
        text,
        speed: speed ?? 1.0,
        language: language || 'zh-cn',
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Generation failed');

    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Generation failed';
    console.error('Preview error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

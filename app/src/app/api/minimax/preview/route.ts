import { NextRequest, NextResponse } from 'next/server';
import { generateSpeech } from '@/lib/elevenlabs-client';
import { ELEVENLABS_CONFIG } from '@/lib/elevenlabs-config';

export async function POST(req: NextRequest) {
  if (!ELEVENLABS_CONFIG.apiKey) {
    return NextResponse.json({ error: 'ElevenLabs API key not configured' }, { status: 503 });
  }

  try {
    const { voiceId, text, speed } = await req.json();

    if (!voiceId || !text) {
      return NextResponse.json({ error: 'voiceId and text are required' }, { status: 400 });
    }

    if (text.length > ELEVENLABS_CONFIG.constraints.textMaxLength) {
      return NextResponse.json(
        { error: `Text exceeds ${ELEVENLABS_CONFIG.constraints.textMaxLength} character limit` },
        { status: 400 }
      );
    }

    const result = await generateSpeech(voiceId, text, speed ?? 1.0);

    const audioUrl = `data:audio/mpeg;base64,${result.audioData.toString('base64')}`;

    return NextResponse.json({
      audioUrl,
      format: result.format,
      status: 'done',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Generation failed';
    console.error('Preview error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

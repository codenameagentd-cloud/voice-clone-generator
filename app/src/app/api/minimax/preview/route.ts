import { NextRequest, NextResponse } from 'next/server';
import { generateSpeech } from '@/lib/minimax-client';
import { MINIMAX_CONFIG } from '@/lib/minimax-config';

export async function POST(req: NextRequest) {
  if (!MINIMAX_CONFIG.apiKey) {
    return NextResponse.json({ error: 'MiniMax API key not configured' }, { status: 503 });
  }

  try {
    const { voiceId, text, speed, pitch, format } = await req.json();

    if (!voiceId || !text) {
      return NextResponse.json({ error: 'voiceId and text are required' }, { status: 400 });
    }

    if (text.length > MINIMAX_CONFIG.constraints.textMaxLength) {
      return NextResponse.json(
        { error: `Text exceeds ${MINIMAX_CONFIG.constraints.textMaxLength} character limit` },
        { status: 400 }
      );
    }

    const result = await generateSpeech(
      voiceId,
      text,
      speed ?? 1.0,
      pitch,
      format ?? 'mp3'
    );

    // Return audio as base64 data URL
    const mimeType = result.format === 'wav' ? 'audio/wav' : 'audio/mpeg';
    const audioUrl = `data:${mimeType};base64,${result.audioData.toString('base64')}`;

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

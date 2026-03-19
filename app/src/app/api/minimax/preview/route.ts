import { NextRequest, NextResponse } from 'next/server';
import { generateSpeech } from '@/lib/minimax-client';
import { MINIMAX_CONFIG } from '@/lib/minimax-config';

export async function POST(req: NextRequest) {
  if (!MINIMAX_CONFIG.apiKey) {
    return NextResponse.json({ error: 'MiniMax API key not configured' }, { status: 503 });
  }

  try {
    const { voiceId, text, speed, pitch } = await req.json();

    if (!voiceId || !text) {
      return NextResponse.json({ error: 'voiceId and text are required' }, { status: 400 });
    }

    if (text.length > MINIMAX_CONFIG.constraints.textMaxLength) {
      return NextResponse.json({ error: `Text exceeds ${MINIMAX_CONFIG.constraints.textMaxLength} character limit` }, { status: 400 });
    }

    const result = await generateSpeech(voiceId, text, speed, pitch);

    // If base64 audio, convert to data URL for frontend
    if (result.audioBase64 && !result.audioUrl) {
      result.audioUrl = `data:audio/wav;base64,${result.audioBase64}`;
    }

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { cloneVoice } from '@/lib/elevenlabs-client';
import { ELEVENLABS_CONFIG } from '@/lib/elevenlabs-config';

export async function POST(req: NextRequest) {
  if (!ELEVENLABS_CONFIG.apiKey) {
    return NextResponse.json({ error: 'ElevenLabs API key not configured' }, { status: 503 });
  }

  try {
    const formData = await req.formData();
    const trainingFile = formData.get('trainingFile') as File | null;
    const voiceName = formData.get('voiceName') as string | null;

    if (!trainingFile) {
      return NextResponse.json({ error: 'Training audio file is required' }, { status: 400 });
    }

    const buffer = Buffer.from(await trainingFile.arrayBuffer());
    const result = await cloneVoice(buffer, trainingFile.name, voiceName || undefined);

    return NextResponse.json({
      voiceId: result.voiceId,
      name: result.name,
      status: 'done',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Clone failed';
    console.error('Clone error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

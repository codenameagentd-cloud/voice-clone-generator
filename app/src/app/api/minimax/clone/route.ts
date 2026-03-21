import { NextRequest, NextResponse } from 'next/server';
import { cloneVoice } from '@/lib/minimax-client';
import { MINIMAX_CONFIG } from '@/lib/minimax-config';

export async function POST(req: NextRequest) {
  if (!MINIMAX_CONFIG.apiKey) {
    return NextResponse.json({ error: 'MiniMax API key not configured' }, { status: 503 });
  }

  try {
    const formData = await req.formData();
    const trainingFile = formData.get('trainingFile') as File | null;
    const voiceName = formData.get('voiceName') as string | null;

    if (!trainingFile) {
      return NextResponse.json({ error: 'Training audio file is required' }, { status: 400 });
    }

    const buffer = Buffer.from(await trainingFile.arrayBuffer());
    
    // Generate a voice_id from the name or a random one
    const voiceId = voiceName 
      ? `clone_${voiceName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}_${Date.now()}`
      : `clone_${Date.now()}`;

    const result = await cloneVoice(buffer, trainingFile.name, voiceId);

    return NextResponse.json({
      voiceId: result.voiceId,
      status: 'done',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Clone failed';
    console.error('Clone error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

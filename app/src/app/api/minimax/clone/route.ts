import { NextRequest, NextResponse } from 'next/server';
import { uploadFile, cloneVoice } from '@/lib/minimax-client';
import { MINIMAX_CONFIG } from '@/lib/minimax-config';

export async function POST(req: NextRequest) {
  if (!MINIMAX_CONFIG.apiKey) {
    return NextResponse.json({ error: 'MiniMax API key not configured' }, { status: 503 });
  }

  try {
    const formData = await req.formData();
    const trainingFile = formData.get('trainingFile') as File | null;
    const referenceFile = formData.get('referenceFile') as File | null;
    const voiceName = formData.get('voiceName') as string | null;

    if (!trainingFile) {
      return NextResponse.json({ error: 'Training sample is required' }, { status: 400 });
    }

    // Upload training file
    const trainingBuffer = Buffer.from(await trainingFile.arrayBuffer());
    const trainingFileId = await uploadFile(trainingBuffer, trainingFile.name);

    // Upload reference file if provided
    let referenceFileId: string | undefined;
    if (referenceFile) {
      const refBuffer = Buffer.from(await referenceFile.arrayBuffer());
      referenceFileId = await uploadFile(refBuffer, referenceFile.name, 'voice_clone_prompt');
    }

    // Clone voice
    const result = await cloneVoice(trainingFileId, referenceFileId, voiceName || undefined);

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Clone failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

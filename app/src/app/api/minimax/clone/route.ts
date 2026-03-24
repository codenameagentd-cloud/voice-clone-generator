import { NextRequest, NextResponse } from 'next/server';

const XTTS_URL = process.env.XTTS_URL || 'http://localhost:8321';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const trainingFile = formData.get('trainingFile') as File | null;
    const voiceName = formData.get('voiceName') as string | null;

    if (!trainingFile) {
      return NextResponse.json({ error: 'Training audio file is required' }, { status: 400 });
    }

    // Forward to XTTS server
    const xttsForm = new FormData();
    xttsForm.append('file', trainingFile);
    if (voiceName) xttsForm.append('name', voiceName);

    const res = await fetch(`${XTTS_URL}/clone`, {
      method: 'POST',
      body: xttsForm,
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Clone failed');

    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Clone failed';
    console.error('Clone error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

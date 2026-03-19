import { NextRequest, NextResponse } from 'next/server';
import { checkTaskStatus } from '@/lib/minimax-client';
import { MINIMAX_CONFIG } from '@/lib/minimax-config';

export async function GET(req: NextRequest) {
  if (!MINIMAX_CONFIG.apiKey) {
    return NextResponse.json({ error: 'MiniMax API key not configured' }, { status: 503 });
  }

  const taskId = req.nextUrl.searchParams.get('taskId');
  if (!taskId) {
    return NextResponse.json({ error: 'taskId is required' }, { status: 400 });
  }

  try {
    const result = await checkTaskStatus(taskId);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Status check failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

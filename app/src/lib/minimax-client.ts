import { MINIMAX_CONFIG, CloneStatus } from './minimax-config';

const { baseUrl, authHeader, endpoints, cloneFields, cloneResponse, t2aFields, t2aResponse } = MINIMAX_CONFIG;

function getApiKey(): string {
  const key = MINIMAX_CONFIG.apiKey;
  if (!key) throw new Error('MINIMAX_API_KEY is not configured');
  return key;
}

/**
 * Upload a file to MiniMax
 * Returns file_id for use in clone/t2a
 */
export async function uploadFile(file: Buffer, filename: string, purpose: string = 'voice_clone'): Promise<string> {
  const key = getApiKey();
  const formData = new FormData();
  formData.append('file', new Blob([file]), filename);
  formData.append('purpose', purpose);

  const res = await fetch(`${baseUrl}${endpoints.fileUpload}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}` },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`File upload failed (${res.status}): ${err}`);
  }

  const data = await res.json();
  return data.file_id || data.id;
}

/**
 * Clone a voice from uploaded training audio
 * Returns voice_id (or task_id if async)
 */
export async function cloneVoice(
  trainingFileId: string,
  referenceFileId?: string,
  voiceName?: string
): Promise<{ voiceId?: string; taskId?: string; status: CloneStatus }> {
  const key = getApiKey();

  const body: Record<string, unknown> = {
    [cloneFields.trainingFile]: trainingFileId,
  };
  if (referenceFileId) body[cloneFields.referenceFile] = referenceFileId;
  if (voiceName) body[cloneFields.voiceName] = voiceName;

  const res = await fetch(`${baseUrl}${endpoints.voiceClone}`, {
    method: 'POST',
    headers: authHeader(key),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Voice clone failed (${res.status}): ${err}`);
  }

  const data = await res.json();
  return {
    voiceId: data[cloneResponse.voiceId],
    taskId: data[cloneResponse.taskId],
    status: data[cloneResponse.status] || (data[cloneResponse.voiceId] ? 'done' : 'processing'),
  };
}

/**
 * Generate speech from text using a cloned voice
 * Handles 3 response shapes: audio URL, base64, or task_id
 */
export async function generateSpeech(
  voiceId: string,
  text: string,
  speed: number = 1.0,
  pitch?: number
): Promise<{ audioUrl?: string; audioBase64?: string; taskId?: string; status: string }> {
  const key = getApiKey();

  const body: Record<string, unknown> = {
    [t2aFields.text]: text,
    [t2aFields.voiceId]: voiceId,
    [t2aFields.speed]: Math.max(MINIMAX_CONFIG.constraints.speedMin, Math.min(MINIMAX_CONFIG.constraints.speedMax, speed)),
  };

  // Only include pitch if the field exists and value is provided
  if (pitch !== undefined && t2aFields.pitch) {
    body[t2aFields.pitch] = Math.max(MINIMAX_CONFIG.constraints.pitchMin, Math.min(MINIMAX_CONFIG.constraints.pitchMax, pitch));
  }

  const res = await fetch(`${baseUrl}${endpoints.t2a}`, {
    method: 'POST',
    headers: authHeader(key),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Speech generation failed (${res.status}): ${err}`);
  }

  const data = await res.json();
  return {
    audioUrl: data[t2aResponse.audioUrl],
    audioBase64: data[t2aResponse.audioBase64],
    taskId: data[t2aResponse.taskId],
    status: data[t2aResponse.status] || (data[t2aResponse.audioUrl] || data[t2aResponse.audioBase64] ? 'done' : 'processing'),
  };
}

/**
 * Check async task status (if MiniMax uses async flow)
 */
export async function checkTaskStatus(taskId: string): Promise<{ status: CloneStatus; audioUrl?: string; voiceId?: string }> {
  const key = getApiKey();
  // Endpoint shape TBD — placeholder
  const res = await fetch(`${baseUrl}/v1/tasks/${taskId}`, {
    method: 'GET',
    headers: authHeader(key),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Task status check failed (${res.status}): ${err}`);
  }

  const data = await res.json();
  return {
    status: data.status || 'processing',
    audioUrl: data.audio_url,
    voiceId: data.voice_id,
  };
}

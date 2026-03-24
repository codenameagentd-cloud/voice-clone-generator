import { ELEVENLABS_CONFIG } from './elevenlabs-config';

const { baseUrl } = ELEVENLABS_CONFIG;

function getApiKey(): string {
  const key = ELEVENLABS_CONFIG.apiKey;
  if (!key) throw new Error('ELEVENLABS_API_KEY is not configured');
  return key;
}

/**
 * Instant Voice Clone — upload audio, get voice_id back immediately.
 */
export async function cloneVoice(
  audioBuffer: Buffer,
  filename: string,
  voiceName?: string
): Promise<{ voiceId: string; name: string }> {
  const key = getApiKey();
  const name = voiceName || `clone_${Date.now()}`;

  const formData = new FormData();
  formData.append('name', name);
  formData.append('files', new Blob([new Uint8Array(audioBuffer)]), filename);
  formData.append('description', `Voice cloned from ${filename}`);

  const res = await fetch(`${baseUrl}${ELEVENLABS_CONFIG.endpoints.addVoice}`, {
    method: 'POST',
    headers: { 'xi-api-key': key },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(`Voice clone failed (${res.status}): ${JSON.stringify(err.detail || err)}`);
  }

  const data = await res.json();
  return { voiceId: data.voice_id, name };
}

/**
 * Generate speech from text using a voice.
 */
export async function generateSpeech(
  voiceId: string,
  text: string,
  speed: number = 1.0,
  modelId?: string
): Promise<{ audioData: Buffer; format: string }> {
  const key = getApiKey();

  const body: Record<string, unknown> = {
    text: text.slice(0, ELEVENLABS_CONFIG.constraints.textMaxLength),
    model_id: modelId || ELEVENLABS_CONFIG.models.multilingualV2,
    voice_settings: {
      stability: 0.5,
      similarity_boost: 0.75,
      style: 0.0,
      use_speaker_boost: true,
      speed: Math.max(ELEVENLABS_CONFIG.constraints.speedMin, Math.min(ELEVENLABS_CONFIG.constraints.speedMax, speed)),
    },
  };

  const res = await fetch(
    `${baseUrl}${ELEVENLABS_CONFIG.endpoints.tts}/${voiceId}`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': key,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg',
      },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(`Speech generation failed (${res.status}): ${JSON.stringify(err.detail || err)}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  return { audioData: Buffer.from(arrayBuffer), format: 'mp3' };
}

/**
 * List available voices.
 */
export async function listVoices(): Promise<Array<{ voice_id: string; name: string; category: string }>> {
  const key = getApiKey();

  const res = await fetch(`${baseUrl}${ELEVENLABS_CONFIG.endpoints.voices}`, {
    headers: { 'xi-api-key': key },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(`List voices failed (${res.status}): ${JSON.stringify(err.detail || err)}`);
  }

  const data = await res.json();
  return data.voices || [];
}

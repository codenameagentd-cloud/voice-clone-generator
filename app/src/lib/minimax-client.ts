import { MINIMAX_CONFIG, CloneStatus } from './minimax-config';

const { baseUrl, constraints } = MINIMAX_CONFIG;

function getApiKey(): string {
  const key = MINIMAX_CONFIG.apiKey;
  if (!key) throw new Error('MINIMAX_API_KEY is not configured');
  return key;
}

function getGroupId(): string {
  const gid = MINIMAX_CONFIG.groupId;
  if (!gid) throw new Error('MINIMAX_GROUP_ID is not configured');
  return gid;
}

/**
 * Clone a voice from audio file.
 * MiniMax clone endpoint accepts multipart form with the audio file directly.
 * Returns voice_id on success.
 */
export async function cloneVoice(
  audioBuffer: Buffer,
  filename: string,
  voiceId?: string
): Promise<{ voiceId: string }> {
  const key = getApiKey();
  const groupId = getGroupId();

  const formData = new FormData();
  formData.append('file', new Blob([new Uint8Array(audioBuffer)]), filename);
  // voice_id: the identifier you want to assign to this cloned voice
  if (voiceId) {
    formData.append('voice_id', voiceId);
  }

  const res = await fetch(
    `${baseUrl}${MINIMAX_CONFIG.endpoints.voiceClone}?GroupId=${groupId}`,
    {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}` },
      body: formData,
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Voice clone failed (${res.status}): ${err}`);
  }

  const data = await res.json();
  if (data.base_resp?.status_code !== 0 && data.base_resp?.status_code !== undefined) {
    throw new Error(`Voice clone error: ${data.base_resp?.status_msg || JSON.stringify(data)}`);
  }

  return {
    voiceId: data.voice_id || voiceId || '',
  };
}

/**
 * Generate speech from text using a cloned (or built-in) voice.
 * Returns audio hex string or audio URL depending on response.
 */
export async function generateSpeech(
  voiceId: string,
  text: string,
  speed: number = 1.0,
  pitch?: number,
  format: string = 'mp3'
): Promise<{ audioData: Buffer; format: string }> {
  const key = getApiKey();
  const groupId = getGroupId();

  const body = {
    model: MINIMAX_CONFIG.t2aFields.model,
    text: text.slice(0, constraints.textMaxLength),
    stream: false,
    voice_setting: {
      voice_id: voiceId,
      speed: Math.max(constraints.speedMin, Math.min(constraints.speedMax, speed)),
      vol: 1.0,
      ...(pitch !== undefined ? { pitch: Math.max(constraints.pitchMin, Math.min(constraints.pitchMax, pitch)) } : {}),
    },
    audio_setting: {
      format: format,
      sample_rate: constraints.defaultSampleRate,
    },
  };

  const res = await fetch(
    `${baseUrl}${MINIMAX_CONFIG.endpoints.t2a}?GroupId=${groupId}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Speech generation failed (${res.status}): ${err}`);
  }

  const data = await res.json();

  if (data.base_resp?.status_code !== 0 && data.base_resp?.status_code !== undefined) {
    throw new Error(`TTS error: ${data.base_resp?.status_msg || JSON.stringify(data)}`);
  }

  // MiniMax returns audio as hex string in data.audio_file.data
  // or as a URL in extra_info.audio_url
  let audioBuffer: Buffer;

  if (data.data?.audio) {
    // hex-encoded audio bytes
    audioBuffer = Buffer.from(data.data.audio, 'hex');
  } else if (data.extra_info?.audio_file) {
    // base64 audio
    audioBuffer = Buffer.from(data.extra_info.audio_file, 'base64');
  } else if (data.audio_file) {
    audioBuffer = Buffer.from(data.audio_file, 'hex');
  } else {
    throw new Error('No audio data in response: ' + JSON.stringify(Object.keys(data)));
  }

  return { audioData: audioBuffer, format };
}

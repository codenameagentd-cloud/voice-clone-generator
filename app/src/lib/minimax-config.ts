/**
 * MiniMax API Configuration
 * All field names centralized here — verified against real API docs.
 */
export const MINIMAX_CONFIG = {
  baseUrl: process.env.MINIMAX_BASE_URL || 'https://api.minimax.chat',
  apiKey: process.env.MINIMAX_API_KEY || '',
  groupId: process.env.MINIMAX_GROUP_ID || '',

  endpoints: {
    voiceClone: '/v1/voice/clone',
    t2a: '/v1/t2a_v2',
  },

  // T2A request fields
  t2aFields: {
    model: 'speech-02-hd',
    text: 'text',
    voiceId: 'voice_setting.voice_id',
    speed: 'voice_setting.speed',
    pitch: 'voice_setting.pitch',
    vol: 'voice_setting.vol',
    format: 'audio_setting.format',
    sampleRate: 'audio_setting.sample_rate',
  },

  // Constraints
  constraints: {
    speedMin: 0.5,
    speedMax: 2.0,
    pitchMin: -12,
    pitchMax: 12,
    textMaxLength: 5000,
    supportedFormats: ['mp3', 'wav', 'pcm', 'flac'],
    defaultFormat: 'mp3',
    defaultSampleRate: 32000,
  },
} as const;

export type CloneStatus = 'queued' | 'processing' | 'done' | 'failed';

/**
 * MiniMax API Configuration
 * All field names centralized here — change ONLY this file when real API is verified.
 */
export const MINIMAX_CONFIG = {
  baseUrl: process.env.MINIMAX_BASE_URL || 'https://api.minimax.chat',
  apiKey: process.env.MINIMAX_API_KEY || '',
  groupId: process.env.MINIMAX_GROUP_ID || '',

  endpoints: {
    fileUpload: '/v1/files/upload',
    voiceClone: '/v1/voice_clone',
    t2a: '/v1/t2a_v2',
  },

  // Clone request field names (待驗證 — update after real API test)
  cloneFields: {
    trainingFile: 'file',           // field name for training audio
    referenceFile: 'prompt_file',   // field name for optional reference audio
    voiceName: 'voice_name',        // optional voice label
  },

  // Clone response field names
  cloneResponse: {
    voiceId: 'voice_id',
    taskId: 'task_id',
    status: 'status',
  },

  // T2A request field names
  t2aFields: {
    text: 'text',
    voiceId: 'voice_id',
    speed: 'speed',
    pitch: 'pitch',        // 待驗證 — may not exist
    volume: 'vol',
    format: 'audio_format',
  },

  // T2A response field names
  t2aResponse: {
    audioUrl: 'audio_url',
    audioBase64: 'audio',
    taskId: 'task_id',
    status: 'status',
  },

  // Constraints
  constraints: {
    speedMin: 0.5,
    speedMax: 2.0,
    pitchMin: -12,
    pitchMax: 12,
    textMaxLength: 500,
    audioMinDuration: 5,    // seconds
    audioMaxDuration: 180,  // seconds
    supportedFormats: ['mp3', 'wav', 'm4a'],
  },

  // Auth header shape (待驗證)
  authHeader: (apiKey: string) => ({
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  }),
} as const;

export type CloneStatus = 'queued' | 'processing' | 'done' | 'failed';

/**
 * ElevenLabs API Configuration
 */
export const ELEVENLABS_CONFIG = {
  baseUrl: process.env.ELEVENLABS_BASE_URL || 'https://api.elevenlabs.io',
  apiKey: process.env.ELEVENLABS_API_KEY || '',

  endpoints: {
    voices: '/v1/voices',
    addVoice: '/v1/voices/add',
    tts: '/v1/text-to-speech', // + /{voice_id}
    deleteVoice: '/v1/voices', // + /{voice_id}
  },

  constraints: {
    speedMin: 0.5,
    speedMax: 2.0,
    // ElevenLabs doesn't have pitch control natively
    textMaxLength: 5000,
    supportedFormats: ['mp3_44100_128', 'pcm_16000', 'pcm_22050', 'pcm_24000', 'pcm_44100'],
    defaultFormat: 'mp3_44100_128',
    maxClonedVoices: 3, // free tier
  },

  models: {
    multilingualV2: 'eleven_multilingual_v2',
    turboV2_5: 'eleven_turbo_v2_5',
  },
} as const;

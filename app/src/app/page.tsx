'use client';

import { useState, useRef, useCallback } from 'react';

type Step = 'voice' | 'test' | 'export';
type Mode = 'preset' | 'clone';

interface Voice {
  voice_id: string;
  name: string;
}

const PRESET_VOICES: Voice[] = [
  { voice_id: 'david-default', name: 'David (Default)' },
];

export default function Home() {
  const [step, setStep] = useState<Step>('voice');
  const [mode, setMode] = useState<Mode>('preset');
  const [selectedVoice, setSelectedVoice] = useState<string>('david-default');
  const [clonedVoiceId, setClonedVoiceId] = useState<string | null>(null);

  // Upload
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // Test
  const [testText, setTestText] = useState('你好，這是語音克隆測試。歡迎使用 Voice Clone Generator。');
  const [generating, setGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [speed, setSpeed] = useState(1.0);
  const [language, setLanguage] = useState('zh-cn');
  const audioRef = useRef<HTMLAudioElement>(null);

  // Export
  const [exporting, setExporting] = useState(false);

  const activeVoiceId = mode === 'clone' && clonedVoiceId ? clonedVoiceId : selectedVoice;

  const handleUpload = useCallback(async () => {
    if (!uploadFile) return;
    setUploading(true);
    setUploadError('');
    try {
      const form = new FormData();
      form.append('trainingFile', uploadFile);
      form.append('voiceName', uploadFile.name.replace(/\.[^.]+$/, ''));
      const res = await fetch('/api/minimax/clone', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setClonedVoiceId(data.voiceId);
      setStep('test');
    } catch (e: unknown) {
      setUploadError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }, [uploadFile]);

  const handleGenerate = useCallback(async () => {
    if (!testText.trim()) return;
    setGenerating(true);
    setAudioUrl(null);
    try {
      const res = await fetch('/api/minimax/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voiceId: activeVoiceId, text: testText, speed, language }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAudioUrl(data.audioUrl);
    } catch {
      alert('Generation failed. Is XTTS server running?');
    } finally {
      setGenerating(false);
    }
  }, [testText, activeVoiceId, speed, language]);

  const handleExport = useCallback(async () => {
    if (!testText.trim()) return;
    setExporting(true);
    try {
      const res = await fetch('/api/minimax/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voiceId: activeVoiceId, text: testText, speed, language }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Convert base64 to blob and download
      const b64 = data.audioUrl.split(',')[1];
      const bytes = atob(b64);
      const arr = new Uint8Array(bytes.length);
      for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
      const blob = new Blob([arr], { type: 'audio/wav' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `voice-clone-${Date.now()}.wav`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Export failed.');
    } finally {
      setExporting(false);
    }
  }, [testText, activeVoiceId, speed, language]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f && (f.type.startsWith('audio/') || /\.(mp3|wav|m4a|ogg|flac)$/i.test(f.name))) {
      setUploadFile(f);
    }
  }, []);

  const stepIndex = step === 'voice' ? 0 : step === 'test' ? 1 : 2;
  const steps = mode === 'clone'
    ? [{ label: 'Upload', n: 1 }, { label: 'Test', n: 2 }, { label: 'Export', n: 3 }]
    : [{ label: 'Select Voice', n: 1 }, { label: 'Test', n: 2 }, { label: 'Export', n: 3 }];

  return (
    <main style={{ maxWidth: 640, margin: '0 auto', padding: '48px 20px' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8, textAlign: 'center' }}>
        Voice Clone Generator
      </h1>
      <p style={{ color: 'var(--text-dim)', textAlign: 'center', marginBottom: 32, fontSize: 14 }}>
        Clone your voice with XTTS v2 — runs locally, zero cost.
      </p>

      {/* Mode Toggle */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 28, justifyContent: 'center', background: 'var(--surface)', borderRadius: 8, padding: 4, maxWidth: 320, margin: '0 auto 28px' }}>
        <button onClick={() => { setMode('preset'); setStep('voice'); }} style={{ flex: 1, padding: '8px 16px', borderRadius: 6, border: 'none', fontSize: 13, fontWeight: 500, background: mode === 'preset' ? 'var(--accent)' : 'transparent', color: mode === 'preset' ? '#0a0a0f' : 'var(--text-dim)', cursor: 'pointer' }}>
          Preset Voices
        </button>
        <button onClick={() => { setMode('clone'); setStep('voice'); }} style={{ flex: 1, padding: '8px 16px', borderRadius: 6, border: 'none', fontSize: 13, fontWeight: 500, background: mode === 'clone' ? 'var(--accent)' : 'transparent', color: mode === 'clone' ? '#0a0a0f' : 'var(--text-dim)', cursor: 'pointer' }}>
          Clone Voice ✨
        </button>
      </div>

      {/* Step Indicator */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 32, justifyContent: 'center' }}>
        {steps.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, color: i <= stepIndex ? 'var(--accent)' : 'var(--text-dim)', fontSize: 13, fontWeight: i <= stepIndex ? 600 : 400 }}>
            <span style={{ width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, background: i <= stepIndex ? 'var(--accent)' : 'var(--surface)', color: i <= stepIndex ? '#0a0a0f' : 'var(--text-dim)', border: `1px solid ${i <= stepIndex ? 'var(--accent)' : 'var(--border)'}` }}>{s.n}</span>
            {s.label}
            {i < steps.length - 1 && <span style={{ color: 'var(--border)', margin: '0 4px' }}>→</span>}
          </div>
        ))}
      </div>

      {/* Voice Select (preset mode) */}
      {step === 'voice' && mode === 'preset' && (
        <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', padding: 32, border: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: 18, marginBottom: 16 }}>Select a Voice</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
            {PRESET_VOICES.map(v => (
              <button key={v.voice_id} onClick={() => setSelectedVoice(v.voice_id)} style={{ padding: '14px 12px', borderRadius: 8, border: `1px solid ${selectedVoice === v.voice_id ? 'var(--accent)' : 'var(--border)'}`, background: selectedVoice === v.voice_id ? 'var(--accent-glow)' : 'var(--bg)', color: 'var(--text)', cursor: 'pointer', textAlign: 'left' }}>
                <div style={{ fontWeight: 500 }}>{v.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>XTTS v2 · Multilingual</div>
              </button>
            ))}
          </div>
          <button onClick={() => setStep('test')} style={{ width: '100%', marginTop: 24, padding: 14, borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#0a0a0f', fontWeight: 600, fontSize: 15, cursor: 'pointer' }}>
            Continue to Test →
          </button>
        </div>
      )}

      {/* Upload (clone mode) */}
      {step === 'voice' && mode === 'clone' && (
        <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', padding: 32, border: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: 18, marginBottom: 16 }}>Upload Voice Sample</h2>
          <p style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 16 }}>
            Upload an audio file (MP3/WAV/M4A, 5s–3min) of the voice you want to clone.
          </p>
          <div
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            onClick={() => document.getElementById('file-input')?.click()}
            style={{ border: '2px dashed var(--border)', borderRadius: 12, padding: '40px 20px', textAlign: 'center', cursor: 'pointer', marginBottom: 16, transition: 'border-color 0.2s' }}
          >
            <input id="file-input" type="file" accept="audio/*" hidden onChange={e => setUploadFile(e.target.files?.[0] || null)} />
            {uploadFile ? (
              <div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>📎 {uploadFile.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4 }}>{(uploadFile.size / 1024).toFixed(1)} KB</div>
              </div>
            ) : (
              <div style={{ color: 'var(--text-dim)', fontSize: 14 }}>
                Drop audio file here or click to browse
              </div>
            )}
          </div>
          {uploadError && <div style={{ color: '#ef4444', fontSize: 13, marginBottom: 12 }}>{uploadError}</div>}
          <button onClick={handleUpload} disabled={!uploadFile || uploading} style={{ width: '100%', padding: 14, borderRadius: 8, border: 'none', background: uploadFile && !uploading ? 'var(--accent)' : 'var(--border)', color: uploadFile && !uploading ? '#0a0a0f' : 'var(--text-dim)', fontWeight: 600, fontSize: 15, cursor: uploadFile && !uploading ? 'pointer' : 'not-allowed' }}>
            {uploading ? 'Cloning...' : 'Clone Voice →'}
          </button>
        </div>
      )}

      {/* Test */}
      {step === 'test' && (
        <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', padding: 32, border: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: 18, marginBottom: 16 }}>Test Voice</h2>

          {/* Language */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, color: 'var(--text-dim)', display: 'block', marginBottom: 6 }}>Language</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {[['zh-cn', '中文'], ['en', 'English'], ['ja', '日本語']].map(([code, label]) => (
                <button key={code} onClick={() => setLanguage(code)} style={{ padding: '6px 14px', borderRadius: 6, border: `1px solid ${language === code ? 'var(--accent)' : 'var(--border)'}`, background: language === code ? 'var(--accent-glow)' : 'transparent', color: language === code ? 'var(--accent)' : 'var(--text-dim)', fontSize: 13, cursor: 'pointer' }}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Text Input */}
          <textarea
            value={testText}
            onChange={e => setTestText(e.target.value)}
            rows={4}
            style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 14, resize: 'vertical', marginBottom: 16, fontFamily: 'inherit', boxSizing: 'border-box' }}
            placeholder="Enter text to synthesize..."
          />

          {/* Speed */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
              <span style={{ color: 'var(--text-dim)' }}>Speed</span>
              <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{speed.toFixed(1)}x</span>
            </div>
            <input type="range" min="0.5" max="2.0" step="0.1" value={speed} onChange={e => setSpeed(parseFloat(e.target.value))} style={{ width: '100%', accentColor: 'var(--accent)' }} />
          </div>

          {/* Generate */}
          <button onClick={handleGenerate} disabled={generating || !testText.trim()} style={{ width: '100%', padding: 14, borderRadius: 8, border: 'none', background: generating ? 'var(--border)' : 'var(--accent)', color: generating ? 'var(--text-dim)' : '#0a0a0f', fontWeight: 600, fontSize: 15, cursor: generating ? 'wait' : 'pointer', marginBottom: 16 }}>
            {generating ? 'Generating...' : '▶ Preview Speech'}
          </button>

          {/* Audio Player */}
          {audioUrl && (
            <div style={{ background: 'var(--bg)', borderRadius: 8, padding: 16, border: '1px solid var(--border)' }}>
              <audio ref={audioRef} src={audioUrl} controls style={{ width: '100%' }} />
            </div>
          )}

          {/* Navigation */}
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button onClick={() => { setStep('voice'); setAudioUrl(null); }} style={{ flex: 1, padding: 12, borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 14 }}>
              ← Back
            </button>
            <button onClick={() => setStep('export')} disabled={!audioUrl} style={{ flex: 1, padding: 12, borderRadius: 8, border: 'none', background: audioUrl ? 'var(--accent)' : 'var(--border)', color: audioUrl ? '#0a0a0f' : 'var(--text-dim)', cursor: audioUrl ? 'pointer' : 'not-allowed', fontWeight: 600, fontSize: 14 }}>
              Export →
            </button>
          </div>
        </div>
      )}

      {/* Export */}
      {step === 'export' && (
        <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', padding: 32, border: '1px solid var(--border)', textAlign: 'center' }}>
          <h2 style={{ fontSize: 18, marginBottom: 8 }}>Export Audio</h2>
          <p style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 24 }}>
            Generate and download the final WAV file.
          </p>
          <button onClick={handleExport} disabled={exporting} style={{ padding: '14px 40px', borderRadius: 8, border: 'none', background: exporting ? 'var(--border)' : 'var(--accent)', color: exporting ? 'var(--text-dim)' : '#0a0a0f', fontWeight: 600, fontSize: 15, cursor: exporting ? 'wait' : 'pointer', marginBottom: 16 }}>
            {exporting ? 'Generating...' : '⬇ Download WAV'}
          </button>
          <div>
            <button onClick={() => setStep('test')} style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 14 }}>
              ← Back to Test
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

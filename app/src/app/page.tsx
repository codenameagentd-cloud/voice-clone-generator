'use client';

import { useState, useRef, useCallback } from 'react';

type Step = 1 | 2 | 3 | 4;
type TrainStatus = 'idle' | 'uploading' | 'training' | 'done' | 'error';
type PreviewStatus = 'idle' | 'generating' | 'playing' | 'error';
type Mode = 'clone' | 'preset';

const PRESET_VOICES = [
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella', lang: 'EN', gender: 'Female' },
  { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', lang: 'EN', gender: 'Female' },
  { id: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi', lang: 'EN', gender: 'Female' },
  { id: 'MF3mGyEYCl7XYWbV9V6O', name: 'Elli', lang: 'EN', gender: 'Female' },
  { id: 'TxGEqnHWrfWFTfGW9XjX', name: 'Josh', lang: 'EN', gender: 'Male' },
  { id: 'VR6AewLTigWG4xSOukaG', name: 'Arnold', lang: 'EN', gender: 'Male' },
  { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam', lang: 'EN', gender: 'Male' },
  { id: 'yoZ06aMxZJJ28mfd3POQ', name: 'Sam', lang: 'EN', gender: 'Male' },
];

export default function Home() {
  const [mode, setMode] = useState<Mode>('preset');
  const [step, setStep] = useState<Step>(1);
  const [file, setFile] = useState<File | null>(null);
  const [trainStatus, setTrainStatus] = useState<TrainStatus>('idle');
  const [trainError, setTrainError] = useState('');
  const [voiceId, setVoiceId] = useState(PRESET_VOICES[0].id);
  const [voiceName, setVoiceName] = useState(PRESET_VOICES[0].name);
  const [previewStatus, setPreviewStatus] = useState<PreviewStatus>('idle');
  const [previewError, setPreviewError] = useState('');
  const [text, setText] = useState('你好，这是语音合成测试。声音听起来怎么样？');
  const [speed, setSpeed] = useState(1.0);
  const [audioUrl, setAudioUrl] = useState('');
  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((f: File) => {
    setFile(f);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  // Clone voice
  const startTraining = async () => {
    if (!file) return;
    setTrainStatus('uploading');
    setTrainError('');
    try {
      const formData = new FormData();
      formData.append('trainingFile', file);
      setTrainStatus('training');
      const res = await fetch('/api/minimax/clone', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Training failed');
      setVoiceId(data.voiceId);
      setVoiceName(data.name || 'Cloned Voice');
      setTrainStatus('done');
      setTimeout(() => setStep(3), 800);
    } catch (err) {
      setTrainError(err instanceof Error ? err.message : 'Training failed');
      setTrainStatus('error');
    }
  };

  // Generate preview
  const generatePreview = async () => {
    if (!voiceId || !text.trim()) return;
    setPreviewStatus('generating');
    setPreviewError('');
    try {
      const res = await fetch('/api/minimax/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voiceId, text: text.trim(), speed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');
      setAudioUrl(data.audioUrl);
      setPreviewStatus('playing');
      setTimeout(() => audioRef.current?.play(), 100);
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : 'Generation failed');
      setPreviewStatus('error');
    }
  };

  const downloadAudio = () => {
    if (!audioUrl) return;
    const a = document.createElement('a');
    a.href = audioUrl;
    a.download = `voice-${voiceName}-${Date.now()}.mp3`;
    a.click();
  };

  const stepLabels = mode === 'clone'
    ? ['Upload', 'Train', 'Test', 'Export']
    : ['Select Voice', 'Test', 'Export'];

  const totalSteps = stepLabels.length;

  return (
    <main style={{ maxWidth: 640, margin: '0 auto', padding: '48px 20px' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8, textAlign: 'center' }}>
        Voice Clone Generator
      </h1>
      <p style={{ color: 'var(--text-dim)', textAlign: 'center', marginBottom: 32, fontSize: 14 }}>
        Clone your voice or use preset voices to generate speech.
      </p>

      {/* Mode toggle */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 28, justifyContent: 'center',
        background: 'var(--surface)', borderRadius: 8, padding: 4, maxWidth: 320, margin: '0 auto 28px' }}>
        <button onClick={() => { setMode('preset'); setStep(1); setAudioUrl(''); }}
          style={{
            flex: 1, padding: '8px 16px', borderRadius: 6, border: 'none', fontSize: 13, fontWeight: 500,
            background: mode === 'preset' ? 'var(--accent)' : 'transparent',
            color: mode === 'preset' ? '#0a0a0f' : 'var(--text-dim)', cursor: 'pointer',
          }}>Preset Voices</button>
        <button onClick={() => { setMode('clone'); setStep(1); setAudioUrl(''); }}
          style={{
            flex: 1, padding: '8px 16px', borderRadius: 6, border: 'none', fontSize: 13, fontWeight: 500,
            background: mode === 'clone' ? 'var(--accent)' : 'transparent',
            color: mode === 'clone' ? '#0a0a0f' : 'var(--text-dim)', cursor: 'pointer',
          }}>Clone Voice ✨</button>
      </div>

      {/* Step indicator */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 32, justifyContent: 'center' }}>
        {stepLabels.map((label, i) => (
          <div key={label} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            color: step >= (i + 1) ? 'var(--accent)' : 'var(--text-dim)',
            fontSize: 13, fontWeight: step === (i + 1) ? 600 : 400,
          }}>
            <span style={{
              width: 24, height: 24, borderRadius: '50%', display: 'flex',
              alignItems: 'center', justifyContent: 'center', fontSize: 12,
              background: step >= (i + 1) ? 'var(--accent)' : 'var(--surface)',
              color: step >= (i + 1) ? '#0a0a0f' : 'var(--text-dim)',
              border: `1px solid ${step >= (i + 1) ? 'var(--accent)' : 'var(--border)'}`,
            }}>{i + 1}</span>
            {label}
            {i < totalSteps - 1 && <span style={{ color: 'var(--border)', margin: '0 4px' }}>→</span>}
          </div>
        ))}
      </div>

      {/* PRESET MODE — Step 1: Select Voice */}
      {mode === 'preset' && step === 1 && (
        <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', padding: 32, border: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: 18, marginBottom: 16 }}>Select a Voice</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {PRESET_VOICES.map(v => (
              <button key={v.id} onClick={() => { setVoiceId(v.id); setVoiceName(v.name); }}
                style={{
                  padding: '14px 12px', borderRadius: 8, border: `1px solid ${voiceId === v.id ? 'var(--accent)' : 'var(--border)'}`,
                  background: voiceId === v.id ? 'var(--accent-glow)' : 'var(--bg)',
                  color: 'var(--text)', cursor: 'pointer', textAlign: 'left',
                }}>
                <div style={{ fontWeight: 500 }}>{v.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>{v.gender} · {v.lang}</div>
              </button>
            ))}
          </div>
          <button onClick={() => setStep(2)} style={{
            width: '100%', marginTop: 24, padding: '14px', borderRadius: 8,
            border: 'none', background: 'var(--accent)', color: '#0a0a0f',
            fontWeight: 600, fontSize: 15, cursor: 'pointer',
          }}>Continue to Test →</button>
        </div>
      )}

      {/* PRESET MODE — Step 2: Test (same as clone step 3) */}
      {((mode === 'preset' && step === 2) || (mode === 'clone' && step === 3)) && (
        <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', padding: 32, border: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: 18, marginBottom: 4 }}>Test Your Voice</h2>
          <div style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 16 }}>
            Using: <strong style={{ color: 'var(--accent)' }}>{voiceName}</strong>
          </div>

          <textarea value={text} onChange={e => setText(e.target.value)} rows={3}
            style={{
              width: '100%', background: 'var(--bg)', border: '1px solid var(--border)',
              borderRadius: 8, padding: 12, color: 'var(--text)', resize: 'vertical',
              fontFamily: 'inherit', fontSize: 14,
            }} />
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4, textAlign: 'right' }}>
            {text.length} characters
          </div>

          <button onClick={generatePreview}
            disabled={previewStatus === 'generating' || !text.trim()}
            style={{
              width: '100%', marginTop: 16, padding: '14px', borderRadius: 8,
              border: 'none', fontWeight: 600, fontSize: 15, cursor: 'pointer',
              background: previewStatus === 'generating' ? 'var(--border)' : 'var(--accent)',
              color: previewStatus === 'generating' ? 'var(--text-dim)' : '#0a0a0f',
            }}>
            {previewStatus === 'generating' ? '⏳ Generating...' : '▶ Preview Speech'}
          </button>

          {previewError && (
            <div style={{ color: 'var(--danger)', fontSize: 13, marginTop: 8 }}>❌ {previewError}</div>
          )}

          {audioUrl && (
            <div style={{ marginTop: 20, background: 'var(--bg)', borderRadius: 8, padding: 16 }}>
              <audio ref={audioRef} src={audioUrl} controls style={{ width: '100%' }}
                onEnded={() => setPreviewStatus('idle')} />
            </div>
          )}

          {/* Speed control */}
          <div style={{ marginTop: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
              <span>Speed</span><span style={{ color: 'var(--accent)' }}>{speed.toFixed(1)}x</span>
            </div>
            <input type="range" min="0.5" max="2.0" step="0.1" value={speed}
              onChange={e => setSpeed(parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--accent)' }} />
            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4, textAlign: 'center' }}>
              Adjust speed, then click Preview again
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 24 }}>
            <button onClick={() => setStep(1)} style={{
              flex: 1, padding: '12px', borderRadius: 8, border: '1px solid var(--border)',
              background: 'transparent', color: 'var(--text-dim)', cursor: 'pointer',
            }}>← Back</button>
            <button onClick={() => audioUrl && setStep(mode === 'preset' ? 3 : 4)} disabled={!audioUrl} style={{
              flex: 1, padding: '12px', borderRadius: 8, border: 'none',
              background: audioUrl ? 'var(--accent)' : 'var(--border)',
              color: audioUrl ? '#0a0a0f' : 'var(--text-dim)', fontWeight: 600,
              cursor: audioUrl ? 'pointer' : 'not-allowed',
            }}>Export →</button>
          </div>
        </div>
      )}

      {/* CLONE MODE — Step 1: Upload */}
      {mode === 'clone' && step === 1 && (
        <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', padding: 32, border: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: 18, marginBottom: 8 }}>Upload Training Sample</h2>
          <div style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 16, padding: '8px 12px',
            background: 'rgba(167,139,250,0.1)', borderRadius: 6, border: '1px solid rgba(167,139,250,0.2)' }}>
            ✨ Voice Clone requires ElevenLabs Starter plan ($5/month)
          </div>

          <div onDragOver={e => e.preventDefault()} onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: '2px dashed var(--border)', borderRadius: 'var(--radius)',
              padding: '48px 24px', textAlign: 'center', cursor: 'pointer',
              transition: 'border-color 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
            <input ref={fileInputRef} type="file" accept="audio/*" hidden
              onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
            {file ? (
              <div>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🎤</div>
                <div style={{ fontWeight: 600 }}>{file.name}</div>
                <div style={{ color: 'var(--text-dim)', fontSize: 13, marginTop: 4 }}>
                  {(file.size / 1024 / 1024).toFixed(1)} MB · Click to change
                </div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📁</div>
                <div style={{ fontWeight: 500 }}>Drop audio file or click to browse</div>
                <div style={{ color: 'var(--text-dim)', fontSize: 13, marginTop: 4 }}>MP3, WAV, M4A · 30s+ recommended</div>
              </div>
            )}
          </div>

          <button onClick={() => file && setStep(2)} disabled={!file} style={{
            width: '100%', marginTop: 24, padding: '14px', borderRadius: 8,
            border: 'none', background: file ? 'var(--accent)' : 'var(--border)',
            color: file ? '#0a0a0f' : 'var(--text-dim)', fontWeight: 600, fontSize: 15,
            cursor: file ? 'pointer' : 'not-allowed',
          }}>Continue to Train →</button>
        </div>
      )}

      {/* CLONE MODE — Step 2: Train */}
      {mode === 'clone' && step === 2 && (
        <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', padding: 32, border: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: 18, marginBottom: 16 }}>Train Voice Clone</h2>
          <div style={{ background: 'var(--bg)', borderRadius: 8, padding: 16, marginBottom: 24 }}>
            <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>Training file</div>
            <div style={{ fontWeight: 500, marginTop: 4 }}>🎤 {file?.name}</div>
          </div>

          {trainStatus === 'idle' && (
            <>
              <button onClick={startTraining} style={{
                width: '100%', padding: '14px', borderRadius: 8, border: 'none',
                background: 'var(--accent)', color: '#0a0a0f', fontWeight: 600, fontSize: 15, cursor: 'pointer',
              }}>Start Training</button>
              <button onClick={() => setStep(1)} style={{
                width: '100%', marginTop: 8, padding: '12px', borderRadius: 8,
                border: '1px solid var(--border)', background: 'transparent',
                color: 'var(--text-dim)', cursor: 'pointer',
              }}>← Back</button>
            </>
          )}

          {(trainStatus === 'uploading' || trainStatus === 'training') && (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ fontSize: 24, marginBottom: 12 }}>⏳</div>
              <div style={{ fontWeight: 500 }}>
                {trainStatus === 'uploading' ? 'Uploading...' : 'Training voice clone...'}
              </div>
              <div style={{ color: 'var(--text-dim)', fontSize: 13, marginTop: 4 }}>This may take 30–60 seconds</div>
            </div>
          )}

          {trainStatus === 'done' && (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
              <div style={{ fontWeight: 500, color: 'var(--success)' }}>Voice clone ready!</div>
            </div>
          )}

          {trainStatus === 'error' && (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{ color: 'var(--danger)', marginBottom: 8 }}>❌ {trainError}</div>
              <button onClick={() => setTrainStatus('idle')} style={{
                padding: '10px 20px', borderRadius: 8, border: '1px solid var(--border)',
                background: 'transparent', color: 'var(--text)', cursor: 'pointer',
              }}>Try Again</button>
            </div>
          )}
        </div>
      )}

      {/* Export (preset step 3, clone step 4) */}
      {((mode === 'preset' && step === 3) || (mode === 'clone' && step === 4)) && (
        <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', padding: 32, border: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: 18, marginBottom: 16 }}>Export</h2>
          <div style={{ background: 'var(--bg)', borderRadius: 8, padding: 16, marginBottom: 16 }}>
            <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>Voice</div>
            <div style={{ fontWeight: 500, marginTop: 4 }}>{voiceName}</div>
          </div>

          {audioUrl && (
            <div style={{ marginBottom: 16 }}>
              <audio src={audioUrl} controls style={{ width: '100%' }} />
            </div>
          )}

          <button onClick={downloadAudio} disabled={!audioUrl} style={{
            width: '100%', padding: '14px', borderRadius: 8, border: 'none',
            background: audioUrl ? 'var(--accent)' : 'var(--border)',
            color: audioUrl ? '#0a0a0f' : 'var(--text-dim)', fontWeight: 600, fontSize: 15,
            cursor: audioUrl ? 'pointer' : 'not-allowed',
          }}>⬇ Download MP3</button>

          <button onClick={() => setStep(mode === 'preset' ? 2 : 3)} style={{
            width: '100%', marginTop: 8, padding: '12px', borderRadius: 8,
            border: '1px solid var(--border)', background: 'transparent',
            color: 'var(--text-dim)', cursor: 'pointer',
          }}>← Back to Test</button>
        </div>
      )}
    </main>
  );
}

'use client';

import { useState, useRef, useCallback } from 'react';

type Step = 1 | 2 | 3 | 4;
type TrainStatus = 'idle' | 'uploading' | 'training' | 'done' | 'error';
type PreviewStatus = 'idle' | 'generating' | 'playing' | 'error';

export default function Home() {
  const [step, setStep] = useState<Step>(1);
  const [file, setFile] = useState<File | null>(null);
  const [refFile, setRefFile] = useState<File | null>(null);
  const [trainStatus, setTrainStatus] = useState<TrainStatus>('idle');
  const [trainError, setTrainError] = useState('');
  const [voiceId, setVoiceId] = useState('');
  const [previewStatus, setPreviewStatus] = useState<PreviewStatus>('idle');
  const [previewError, setPreviewError] = useState('');
  const [text, setText] = useState('你好，这是我的克隆声音。听起来怎么样？');
  const [speed, setSpeed] = useState(1.0);
  const [tone, setTone] = useState(0);
  const [audioUrl, setAudioUrl] = useState('');
  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const refInputRef = useRef<HTMLInputElement>(null);

  // Step 1: Upload
  const handleFile = useCallback((f: File) => {
    const valid = ['audio/mpeg', 'audio/wav', 'audio/x-m4a', 'audio/mp4', 'audio/webm', 'audio/ogg'];
    if (!valid.some(t => f.type.startsWith(t.split('/')[0]))) {
      alert('Please upload an audio file (MP3, WAV, M4A)');
      return;
    }
    setFile(f);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  // Step 2: Train
  const startTraining = async () => {
    if (!file) return;
    setTrainStatus('uploading');
    setTrainError('');
    
    try {
      const formData = new FormData();
      formData.append('trainingFile', file);
      if (refFile) formData.append('referenceFile', refFile);
      
      setTrainStatus('training');
      const res = await fetch('/api/minimax/clone', { method: 'POST', body: formData });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Training failed');
      
      setVoiceId(data.voiceId);
      setTrainStatus('done');
      setTimeout(() => setStep(3), 800);
    } catch (err) {
      setTrainError(err instanceof Error ? err.message : 'Training failed');
      setTrainStatus('error');
    }
  };

  // Step 3: Preview
  const generatePreview = async () => {
    if (!voiceId || !text.trim()) return;
    setPreviewStatus('generating');
    setPreviewError('');
    
    try {
      const res = await fetch('/api/minimax/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voiceId, text: text.trim(), speed, pitch: tone }),
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Generation failed');
      
      setAudioUrl(data.audioUrl);
      setPreviewStatus('playing');
      
      // Auto-play
      setTimeout(() => audioRef.current?.play(), 100);
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : 'Generation failed');
      setPreviewStatus('error');
    }
  };

  // Step 4: Export
  const downloadAudio = () => {
    if (!audioUrl) return;
    const a = document.createElement('a');
    a.href = audioUrl;
    a.download = `voice-clone-${Date.now()}.mp3`;
    a.click();
  };

  return (
    <main style={{ maxWidth: 640, margin: '0 auto', padding: '48px 20px' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8, textAlign: 'center' }}>
        Voice Clone Generator
      </h1>
      <p style={{ color: 'var(--text-dim)', textAlign: 'center', marginBottom: 40, fontSize: 14 }}>
        Upload a voice sample, train your clone, and generate speech.
      </p>

      {/* Step indicator */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 32, justifyContent: 'center' }}>
        {(['Upload', 'Train', 'Test', 'Export'] as const).map((label, i) => (
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
            {i < 3 && <span style={{ color: 'var(--border)', margin: '0 4px' }}>→</span>}
          </div>
        ))}
      </div>

      {/* Step 1: Upload */}
      {step === 1 && (
        <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', padding: 32, border: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: 18, marginBottom: 16 }}>Upload Training Sample</h2>
          
          <div
            onDragOver={e => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: '2px dashed var(--border)', borderRadius: 'var(--radius)',
              padding: '48px 24px', textAlign: 'center', cursor: 'pointer',
              transition: 'border-color 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
          >
            <input ref={fileInputRef} type="file" accept="audio/*" hidden
              onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
            {file ? (
              <div>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🎤</div>
                <div style={{ fontWeight: 600 }}>{file.name}</div>
                <div style={{ color: 'var(--text-dim)', fontSize: 13, marginTop: 4 }}>
                  {(file.size / 1024 / 1024).toFixed(1)} MB • Click to change
                </div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📁</div>
                <div style={{ fontWeight: 500 }}>Drop audio file here or click to browse</div>
                <div style={{ color: 'var(--text-dim)', fontSize: 13, marginTop: 4 }}>MP3, WAV, M4A • 5s–3min recommended</div>
              </div>
            )}
          </div>

          {/* Reference upload (optional) */}
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 8 }}>
              Reference Sample (optional)
            </div>
            <div
              onClick={() => refInputRef.current?.click()}
              style={{
                border: '1px dashed var(--border)', borderRadius: 8, padding: '16px',
                textAlign: 'center', cursor: 'pointer', fontSize: 13,
              }}
            >
              <input ref={refInputRef} type="file" accept="audio/*" hidden
                onChange={e => e.target.files?.[0] && setRefFile(e.target.files[0])} />
              {refFile ? `📎 ${refFile.name}` : '+ Add reference sample'}
            </div>
          </div>

          <button
            onClick={() => file && setStep(2)}
            disabled={!file}
            style={{
              width: '100%', marginTop: 24, padding: '14px', borderRadius: 8,
              border: 'none', background: file ? 'var(--accent)' : 'var(--border)',
              color: file ? '#0a0a0f' : 'var(--text-dim)', fontWeight: 600,
              fontSize: 15, cursor: file ? 'pointer' : 'not-allowed',
            }}
          >
            Continue to Train →
          </button>
        </div>
      )}

      {/* Step 2: Train */}
      {step === 2 && (
        <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', padding: 32, border: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: 18, marginBottom: 16 }}>Train Voice Clone</h2>
          
          <div style={{ background: 'var(--bg)', borderRadius: 8, padding: 16, marginBottom: 24 }}>
            <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>Training file</div>
            <div style={{ fontWeight: 500, marginTop: 4 }}>🎤 {file?.name}</div>
            {refFile && <div style={{ marginTop: 8, fontSize: 13, color: 'var(--text-dim)' }}>📎 Ref: {refFile.name}</div>}
          </div>

          {trainStatus === 'idle' && (
            <>
              <button onClick={startTraining} style={{
                width: '100%', padding: '14px', borderRadius: 8, border: 'none',
                background: 'var(--accent)', color: '#0a0a0f', fontWeight: 600,
                fontSize: 15, cursor: 'pointer',
              }}>
                Start Training
              </button>
              <button onClick={() => setStep(1)} style={{
                width: '100%', marginTop: 8, padding: '12px', borderRadius: 8,
                border: '1px solid var(--border)', background: 'transparent',
                color: 'var(--text-dim)', cursor: 'pointer', fontSize: 14,
              }}>
                ← Back
              </button>
            </>
          )}

          {(trainStatus === 'uploading' || trainStatus === 'training') && (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ fontSize: 32, marginBottom: 12, animation: 'spin 1.5s linear infinite' }}>⏳</div>
              <div style={{ fontWeight: 500 }}>
                {trainStatus === 'uploading' ? 'Uploading audio...' : 'Training voice clone...'}
              </div>
              <div style={{ color: 'var(--text-dim)', fontSize: 13, marginTop: 4 }}>
                This may take 30-60 seconds
              </div>
              <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          {trainStatus === 'done' && (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
              <div style={{ fontWeight: 500, color: 'var(--success)' }}>Voice clone ready!</div>
              <div style={{ color: 'var(--text-dim)', fontSize: 13, marginTop: 4 }}>Voice ID: {voiceId}</div>
            </div>
          )}

          {trainStatus === 'error' && (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{ color: 'var(--danger)', marginBottom: 8 }}>❌ {trainError}</div>
              <button onClick={() => { setTrainStatus('idle'); }} style={{
                padding: '10px 20px', borderRadius: 8, border: '1px solid var(--border)',
                background: 'transparent', color: 'var(--text)', cursor: 'pointer',
              }}>
                Try Again
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Test */}
      {step === 3 && (
        <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', padding: 32, border: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: 18, marginBottom: 16 }}>Test Your Voice</h2>
          
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            rows={3}
            style={{
              width: '100%', background: 'var(--bg)', border: '1px solid var(--border)',
              borderRadius: 8, padding: 12, color: 'var(--text)', resize: 'vertical',
              fontFamily: 'inherit', fontSize: 14,
            }}
          />
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4, textAlign: 'right' }}>
            {text.length} characters
          </div>

          <button
            onClick={generatePreview}
            disabled={previewStatus === 'generating' || !text.trim()}
            style={{
              width: '100%', marginTop: 16, padding: '14px', borderRadius: 8,
              border: 'none', fontWeight: 600, fontSize: 15, cursor: 'pointer',
              background: previewStatus === 'generating' ? 'var(--border)' : 'var(--accent)',
              color: previewStatus === 'generating' ? 'var(--text-dim)' : '#0a0a0f',
            }}
          >
            {previewStatus === 'generating' ? 'Generating...' : 'Preview Speech'}
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

          {/* Speed & Tone controls */}
          <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                <span>Speed</span><span style={{ color: 'var(--accent)' }}>{speed.toFixed(1)}x</span>
              </div>
              <input type="range" min="0.5" max="2.0" step="0.1" value={speed}
                onChange={e => setSpeed(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--accent)' }} />
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                <span>Tone</span><span style={{ color: 'var(--accent)' }}>{tone > 0 ? '+' : ''}{tone}</span>
              </div>
              <input type="range" min="-12" max="12" step="1" value={tone}
                onChange={e => setTone(parseInt(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--accent)' }} />
            </div>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4, textAlign: 'center' }}>
            Adjust speed, then click Preview again to hear changes
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 24 }}>
            <button onClick={() => setStep(1)} style={{
              flex: 1, padding: '12px', borderRadius: 8, border: '1px solid var(--border)',
              background: 'transparent', color: 'var(--text-dim)', cursor: 'pointer',
            }}>← Re-upload</button>
            <button onClick={() => audioUrl && setStep(4)} disabled={!audioUrl} style={{
              flex: 1, padding: '12px', borderRadius: 8, border: 'none',
              background: audioUrl ? 'var(--accent)' : 'var(--border)',
              color: audioUrl ? '#0a0a0f' : 'var(--text-dim)', fontWeight: 600, cursor: audioUrl ? 'pointer' : 'not-allowed',
            }}>Export →</button>
          </div>
        </div>
      )}

      {/* Step 4: Export */}
      {step === 4 && (
        <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', padding: 32, border: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: 18, marginBottom: 16 }}>Export</h2>
          
          <div style={{ background: 'var(--bg)', borderRadius: 8, padding: 16, marginBottom: 16 }}>
            <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>Voice ID</div>
            <div style={{ fontWeight: 500, fontFamily: 'monospace', marginTop: 4, wordBreak: 'break-all' }}>{voiceId}</div>
          </div>

          {audioUrl && (
            <div style={{ marginBottom: 16 }}>
              <audio src={audioUrl} controls style={{ width: '100%' }} />
            </div>
          )}

          <button onClick={downloadAudio} disabled={!audioUrl} style={{
            width: '100%', padding: '14px', borderRadius: 8, border: 'none',
            background: audioUrl ? 'var(--accent)' : 'var(--border)',
            color: audioUrl ? '#0a0a0f' : 'var(--text-dim)', fontWeight: 600,
            fontSize: 15, cursor: audioUrl ? 'pointer' : 'not-allowed',
          }}>
            ⬇ Download Audio
          </button>

          <button onClick={() => setStep(3)} style={{
            width: '100%', marginTop: 8, padding: '12px', borderRadius: 8,
            border: '1px solid var(--border)', background: 'transparent',
            color: 'var(--text-dim)', cursor: 'pointer',
          }}>← Back to Test</button>
        </div>
      )}
    </main>
  );
}

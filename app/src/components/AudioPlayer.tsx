'use client';
import { useRef, useState, useEffect, useCallback } from 'react';

interface AudioPlayerProps {
  audioUrl: string | null;
  speed: number;
  tone: number; // semitones -12 to +12
}

export default function AudioPlayer({ audioUrl, speed, tone }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  // Setup Web Audio API for detune (tone)
  const setupAudioContext = useCallback(() => {
    if (!audioRef.current || audioCtxRef.current) return;
    const ctx = new AudioContext();
    const source = ctx.createMediaElementSource(audioRef.current);
    source.connect(ctx.destination);
    audioCtxRef.current = ctx;
    sourceRef.current = source;
  }, []);

  // Apply speed via playbackRate
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  }, [speed]);

  // Apply tone via detune (cents = semitones * 100)
  useEffect(() => {
    if (sourceRef.current) {
      // detune is on AudioBufferSourceNode, not MediaElementSource
      // For MediaElement, we use playbackRate approximation or OfflineAudioContext
      // For now, this is a placeholder — real implementation needs pitch-shift library
    }
  }, [tone]);

  const togglePlay = () => {
    if (!audioRef.current || !audioUrl) return;
    setupAudioContext();

    if (audioRef.current.ended || progress >= 100) {
      // Restart from beginning
      audioRef.current.currentTime = 0;
      setProgress(0);
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const ct = audioRef.current.currentTime;
    const dur = audioRef.current.duration || 1;
    setCurrentTime(ct);
    setProgress((ct / dur) * 100);
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setProgress(100);
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    const val = parseFloat(e.target.value);
    audioRef.current.currentTime = (val / 100) * (audioRef.current.duration || 1);
    setProgress(val);
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  if (!audioUrl) return null;

  return (
    <div className="audio-player">
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onLoadedMetadata={handleLoadedMetadata}
        preload="metadata"
      />
      <button className="play-btn" onClick={togglePlay}>
        {isPlaying ? '⏸' : '▶'}
      </button>
      <input
        type="range"
        min={0}
        max={100}
        value={progress}
        onChange={handleSeek}
        className="seek-bar"
      />
      <span className="time-display">
        {formatTime(currentTime)} / {formatTime(duration)}
      </span>
    </div>
  );
}

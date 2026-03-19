'use client';
import { useRef, useState, DragEvent } from 'react';

interface UploadZoneProps {
  label: string;
  required?: boolean;
  onFileSelect: (file: File | null) => void;
  icon?: string;
}

export default function UploadZone({ label, required = false, onFileSelect, icon = '🎙' }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = (f: File) => {
    setFile(f);
    onFileSelect(f);
  };

  const removeFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFile(null);
    onFileSelect(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
  };

  const formatSize = (bytes: number) =>
    bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`;

  return (
    <div>
      <div className="upload-label">
        {label} {required && <span className="required">*</span>}
      </div>
      <div
        className={`upload-zone ${file ? 'has-file' : ''} ${dragOver ? 'dragover' : ''}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        {file ? (
          <div className="file-info">
            <div className="file-icon">{icon}</div>
            <div className="file-meta">
              <div className="file-name">{file.name}</div>
              <div className="file-size">{formatSize(file.size)}</div>
            </div>
            <button className="file-remove" onClick={removeFile}>✕</button>
          </div>
        ) : (
          <>
            <div className="upload-icon">{icon}</div>
            <div className="upload-text"><strong>Click to upload</strong> or drag and drop</div>
            <div className="upload-formats">MP3, WAV, M4A · 5s – 3min</div>
          </>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".mp3,.wav,.m4a,audio/*"
        hidden
        onChange={(e) => e.target.files?.length && handleFile(e.target.files[0])}
      />
    </div>
  );
}

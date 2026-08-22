'use client';

import { useState, useRef, DragEvent, ChangeEvent } from 'react';

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
const ACCEPTED_AUDIO_TYPES = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/mp4', 'audio/aac', 'audio/ogg'];
const MAX_SIZE_MB = 10;

type AudioMode = 'tts' | 'upload';

export default function TestPage() {
  const [script, setScript] = useState('Hello, welcome to our platform!');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [audioMode, setAudioMode] = useState<AudioMode>('tts');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  const validateAndSetImage = (file: File) => {
    setImageError(null);
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setImageError('Unsupported file type. Please use JPG, PNG, WEBP, GIF, or AVIF.');
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setImageError(`File is too large. Max size is ${MAX_SIZE_MB}MB.`);
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const validateAndSetAudio = (file: File) => {
    setAudioError(null);
    if (!ACCEPTED_AUDIO_TYPES.includes(file.type)) {
      setAudioError('Unsupported audio type. Please use MP3, WAV, M4A, AAC, or OGG.');
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setAudioError(`File is too large. Max size is ${MAX_SIZE_MB}MB.`);
      return;
    }
    setAudioFile(file);
  };

  const handleImageInput = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) validateAndSetImage(file);
  };

  const handleImageDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) validateAndSetImage(file);
  };

  const handleAudioInput = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) validateAndSetAudio(file);
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setImageError(null);
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const handleRemoveAudio = () => {
    setAudioFile(null);
    setAudioError(null);
    if (audioInputRef.current) audioInputRef.current.value = '';
  };

  const handleGenerate = async () => {
    if (!imageFile) {
      setImageError('Please upload an image first.');
      return;
    }
    if (audioMode === 'upload' && !audioFile) {
      setAudioError('Please upload an audio file, or switch to text-to-speech.');
      return;
    }
    if (audioMode === 'tts' && !script.trim()) {
      setAudioError('Please enter some text for the avatar to speak.');
      return;
    }

    setLoading(true);
    setVideoUrl(null);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append('image', imageFile);
      formData.append('resolution', '480p');

      if (audioMode === 'upload' && audioFile) {
        formData.append('audio', audioFile);
      } else {
        formData.append('text', script);
      }

      const res = await fetch('/api/test-veed', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Server error (${res.status}): ${text.slice(0, 300)}`);
      }

      const data = await res.json();

      if (data.videoUrl) {
        setVideoUrl(data.videoUrl);
      } else {
        setErrorMessage(data.error || 'Video generation failed.');
      }
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-8 max-w-3xl mx-auto font-sans">
      <h1 className="text-2xl font-bold mb-4 text-amber-400">🎬 VEED Fabric 1.0 Test</h1>

      {/* Image upload */}
      <label className="block text-xs text-slate-400 mb-2">
        Character Image <span className="text-amber-500">*required</span>
      </label>

      {!imagePreview ? (
        <div
          onClick={() => imageInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleImageDrop}
          className={`w-full border-2 border-dashed rounded-xl p-8 mb-2 text-center cursor-pointer transition
            ${isDragging ? 'border-amber-500 bg-slate-900/60' : 'border-slate-700 hover:border-slate-500'}`}
        >
          <p className="text-sm text-slate-300 mb-1">Click or drag an image here to upload</p>
          <p className="text-xs text-slate-500">JPG, PNG, WEBP, GIF, AVIF · Max {MAX_SIZE_MB}MB</p>
          <input
            ref={imageInputRef}
            type="file"
            accept={ACCEPTED_IMAGE_TYPES.join(',')}
            onChange={handleImageInput}
            className="hidden"
          />
        </div>
      ) : (
        <div className="relative mb-2 inline-block">
          <img src={imagePreview} alt="Uploaded image preview" className="rounded-xl max-h-64 border border-slate-700" />
          <button
            onClick={handleRemoveImage}
            className="absolute -top-2 -right-2 bg-red-600 hover:bg-red-500 text-white text-xs w-6 h-6 rounded-full flex items-center justify-center"
            aria-label="Remove image"
          >
            ✕
          </button>
          <p className="text-xs text-slate-500 mt-1">
            {imageFile?.name} · {((imageFile?.size || 0) / 1024 / 1024).toFixed(1)}MB
          </p>
        </div>
      )}
      {imageError && <p className="text-xs text-red-400 mb-4">{imageError}</p>}

      {/* Audio source toggle */}
      <label className="block text-xs text-slate-400 mb-2 mt-6">
        Voice Source <span className="text-amber-500">*required</span>
      </label>
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setAudioMode('tts')}
          className={`flex-1 py-2 rounded-lg text-sm border transition
            ${audioMode === 'tts' ? 'bg-amber-600 border-amber-600 text-slate-950 font-bold' : 'border-slate-700 text-slate-300 hover:border-slate-500'}`}
        >
          Text to Speech
        </button>
        <button
          onClick={() => setAudioMode('upload')}
          className={`flex-1 py-2 rounded-lg text-sm border transition
            ${audioMode === 'upload' ? 'bg-amber-600 border-amber-600 text-slate-950 font-bold' : 'border-slate-700 text-slate-300 hover:border-slate-500'}`}
        >
          Upload Audio
        </button>
      </div>

      {audioMode === 'tts' ? (
        <textarea
          value={script}
          onChange={(e) => setScript(e.target.value)}
          rows={3}
          placeholder="Enter the line your avatar should speak"
          className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white mb-4 text-sm font-mono focus:outline-none focus:border-amber-500"
        />
      ) : (
        <div className="mb-4">
          {!audioFile ? (
            <input
              ref={audioInputRef}
              type="file"
              accept={ACCEPTED_AUDIO_TYPES.join(',')}
              onChange={handleAudioInput}
              className="w-full text-sm text-slate-300"
            />
          ) : (
            <div className="flex items-center justify-between bg-slate-900 border border-slate-700 rounded-xl p-3">
              <span className="text-sm text-slate-300">
                🎵 {audioFile.name} · {(audioFile.size / 1024 / 1024).toFixed(1)}MB
              </span>
              <button onClick={handleRemoveAudio} className="text-red-400 hover:text-red-300 text-xs">
                Remove
              </button>
            </div>
          )}
        </div>
      )}
      {audioError && <p className="text-xs text-red-400 mb-4">{audioError}</p>}

      <button
        onClick={handleGenerate}
        disabled={loading}
        className="w-full bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-slate-950 font-bold py-3 rounded-xl transition text-sm mb-6"
      >
        {loading ? 'Generating...' : 'Generate 🚀'}
      </button>

      {videoUrl && (
        <div className="mb-6 flex flex-col items-center">
          <p className="text-xs text-slate-400 mb-2">Generated Video:</p>
          <video src={videoUrl} controls className="rounded-xl max-h-96 shadow-lg border border-slate-700" />
        </div>
      )}

      {errorMessage && (
        <p className="text-sm text-red-400">{errorMessage}</p>
      )}
    </main>
  );
}
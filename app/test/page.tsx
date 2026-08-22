'use client';

import CharacterSelect from '@/components/character-select';
import { useState, useRef, type ChangeEvent } from 'react';

const CHARACTER_VOICE_MAP: Record<string, string> = {
  Alex: 'Brian',
  Ava: 'Sarah',
  Beau: 'Matilda',
  Cleo: 'Alice',
  Dex: 'Bill',
  Elle: 'Charlotte',
  Finn: 'Liam',
  Nia: 'Jessica',
  Noah: 'George',
  Quinn: 'Chris',
};

const ACCEPTED_AUDIO_TYPES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/mp4',
  'audio/aac',
  'audio/ogg',
];
const MAX_SIZE_MB = 25;

type AudioMode = 'tts' | 'upload';

export default function TestPage() {
  const [script, setScript] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);

  const [selectedVoice, setSelectedVoice] = useState<string>('Aria');

  const [audioMode, setAudioMode] = useState<AudioMode>('tts');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const audioInputRef = useRef<HTMLInputElement>(null);

  // Directly receives the clean character name (e.g. "Alex")
  const handleCharacterSelected = (
    file: File | null,
    _previewUrl: string | null,
    characterName?: string
  ) => {
    setImageFile(file);
    setImageError(null);

    if (characterName) {
      const voice = CHARACTER_VOICE_MAP[characterName] || 'Aria';
      setSelectedVoice(voice);
    }
  };

  const handleAudioInput = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setAudioError(null);
    if (!file) return;

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

  const handleRemoveAudio = () => {
    setAudioFile(null);
    setAudioError(null);
    if (audioInputRef.current) audioInputRef.current.value = '';
  };

  const handleGenerate = async () => {
    if (!imageFile) {
      setImageError('Please select or upload a character image first.');
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
    setImageError(null);
    setAudioError(null);

    try {
      const formData = new FormData();
      formData.append('resolution', '480p');
      formData.append('image', imageFile);

      if (audioMode === 'upload' && audioFile) {
        formData.append('audio', audioFile);
      } else {
        formData.append('text', script);
        formData.append('voice', selectedVoice);
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
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Unknown error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-8 max-w-3xl mx-auto font-sans">
      <h1 className="text-2xl font-bold mb-6 text-amber-400">🎬 VEED Fabric 1.0 Test</h1>

      {/* Character Selector */}
      <div className="mb-4">
        <CharacterSelect onImageSelected={handleCharacterSelected} />
        {imageError && <p className="mt-2 text-xs text-red-400">{imageError}</p>}
      </div>

      {/* Voice Source Selector */}
      <label className="block text-xs text-slate-400 mb-2 mt-6">
        Voice Source <span className="text-amber-500">*required</span>
      </label>
      <div className="flex gap-2 mb-4">
        <button
          type="button"
          onClick={() => setAudioMode('tts')}
          className={`flex-1 py-2 rounded-lg text-sm border transition ${
            audioMode === 'tts'
              ? 'bg-amber-600 border-amber-600 text-slate-950 font-bold'
              : 'border-slate-700 text-slate-300 hover:border-slate-500'
          }`}
        >
          Text to Speech
        </button>
        <button
          type="button"
          onClick={() => setAudioMode('upload')}
          className={`flex-1 py-2 rounded-lg text-sm border transition ${
            audioMode === 'upload'
              ? 'bg-amber-600 border-amber-600 text-slate-950 font-bold'
              : 'border-slate-700 text-slate-300 hover:border-slate-500'
          }`}
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
              <button
                type="button"
                onClick={handleRemoveAudio}
                className="text-red-400 hover:text-red-300 text-xs"
              >
                Remove
              </button>
            </div>
          )}
        </div>
      )}
      {audioError && <p className="mb-4 text-xs text-red-400">{audioError}</p>}

      {/* Generate Button */}
      <button
        type="button"
        onClick={handleGenerate}
        disabled={loading}
        className="w-full bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-slate-950 font-bold py-3.5 rounded-xl transition text-sm mb-6"
      >
        {loading ? 'Generating Video...' : 'Generate 🚀'}
      </button>

      {/* Video Preview */}
      {videoUrl && (
        <div className="mb-6 flex flex-col items-center bg-slate-900 border border-slate-800 rounded-2xl p-6">
          
          <video
            src={videoUrl}
            controls
            autoPlay
            className="rounded-xl max-h-96 w-full object-contain shadow-lg border border-slate-700"
          />
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="p-4 bg-rose-950/60 border border-rose-800 rounded-xl text-rose-300 text-sm">
          {errorMessage}
        </div>
      )}
    </main>
  );
}
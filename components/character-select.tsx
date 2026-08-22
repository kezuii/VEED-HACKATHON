'use client';

import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react';

const MAX_SIZE_MB = 10;
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];

type ImageMode = 'upload' | 'gallery';

interface CharacterSelectProps {
  onImageSelected?: (file: File | null, previewUrl: string | null) => void;
}

export default function CharacterSelect({ onImageSelected }: CharacterSelectProps) {
  const [imageMode, setImageMode] = useState<ImageMode>('gallery');
  const [galleryImages, setGalleryImages] = useState<{ name: string; url: string }[]>([]);
  const [selectedGalleryUrl, setSelectedGalleryUrl] = useState<string>('');

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/list-images')
      .then((res) => res.json())
      .then((data) => {
        if (data.images) setGalleryImages(data.images);
      })
      .catch(() => setImageError('Failed to load image gallery.'));
  }, []);

  const handleSelectGalleryImage = async (url: string, name: string) => {
    setImageError(null);
    setSelectedGalleryUrl(url);
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const file = new File([blob], name, { type: blob.type });
      setImageFile(file);
      setImagePreview(url);
      onImageSelected?.(file, url);
    } catch {
      setImageError('Failed to load the selected image.');
    }
  };

  const processFile = (file: File) => {
    setImageError(null);
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setImageError('Unsupported file type.');
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setImageError(`File exceeds maximum size of ${MAX_SIZE_MB}MB.`);
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setImageFile(file);
    setImagePreview(previewUrl);
    setSelectedGalleryUrl('');
    onImageSelected?.(file, previewUrl);
  };

  const handleImageInput = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleImageDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setSelectedGalleryUrl('');
    if (imageInputRef.current) imageInputRef.current.value = '';
    onImageSelected?.(null, null);
  };

  return (
    <div className="w-full rounded-xl border border-slate-800 bg-slate-950 p-4">
      <label className="mb-2 block text-xs text-slate-400">Character Image</label>

      <div className="mb-4 flex gap-2">
        <button
          type="button"
          onClick={() => setImageMode('gallery')}
          className={`flex-1 rounded-lg border py-2 text-sm transition ${
            imageMode === 'gallery'
              ? 'border-amber-600 bg-amber-600 text-slate-950 font-bold'
              : 'border-slate-700 text-slate-300 hover:border-slate-500'
          }`}
        >
          Choose from Gallery
        </button>
        <button
          type="button"
          onClick={() => setImageMode('upload')}
          className={`flex-1 rounded-lg border py-2 text-sm transition ${
            imageMode === 'upload'
              ? 'border-amber-600 bg-amber-600 text-slate-950 font-bold'
              : 'border-slate-700 text-slate-300 hover:border-slate-500'
          }`}
        >
          Upload My Own
        </button>
      </div>

      {imageMode === 'gallery' ? (
        /* 드롭다운 없이 오직 썸네일 그리드만 표시 */
        <div className="mb-4 grid grid-cols-4 gap-2">
          {galleryImages.map((img) => (
            <button
              key={img.url}
              type="button"
              onClick={() => handleSelectGalleryImage(img.url, img.name)}
              className={`relative overflow-hidden rounded-lg border-2 transition ${
                selectedGalleryUrl === img.url
                  ? 'border-amber-500'
                  : 'border-slate-700 hover:border-slate-500'
              }`}
            >
              <img src={img.url} alt={img.name} className="h-20 w-full object-cover" />
              {selectedGalleryUrl === img.url && (
                <span
                  className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-sm font-bold text-slate-950 shadow"
                  aria-label="Selected"
                >
                  ✓
                </span>
              )}
            </button>
          ))}
        </div>
      ) : (
        <div
          onClick={() => imageInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleImageDrop}
          className={`mb-4 w-full cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition ${
            isDragging ? 'border-amber-500 bg-slate-900/60' : 'border-slate-700 hover:border-slate-500'
          }`}
        >
          <p className="mb-1 text-sm text-slate-300">Click or drag an image here to upload</p>
          <p className="text-xs text-slate-500">JPG, PNG, WEBP, GIF, AVIF · Max {MAX_SIZE_MB}MB</p>
          <input
            ref={imageInputRef}
            type="file"
            accept={ACCEPTED_IMAGE_TYPES.join(',')}
            onChange={handleImageInput}
            className="hidden"
          />
        </div>
      )}

      {imagePreview && (
        <div className="relative mb-4 inline-block">
          <img
            src={imagePreview}
            alt="Selected preview"
            className="max-h-64 rounded-xl border border-slate-700"
          />
          <button
            type="button"
            onClick={handleRemoveImage}
            className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-xs text-white shadow hover:bg-red-500"
            aria-label="Remove image"
          >
            ✕
          </button>
        </div>
      )}

      {imageError && <p className="mb-4 text-xs text-red-400">{imageError}</p>}
    </div>
  );
}
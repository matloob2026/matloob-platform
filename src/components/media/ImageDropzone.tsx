"use client";

import { useCallback, useRef, useState } from "react";

const MAX_IMAGES = 10;
const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB, matches MediaService.MAX_IMAGE_BYTES
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export interface StagedImage {
  file: File;
  previewUrl: string;
}

export function ImageDropzone({
  images,
  onChange,
}: {
  images: StagedImage[];
  onChange: (next: StagedImage[]) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addFiles = useCallback(
    (fileList: FileList | File[]) => {
      setError(null);
      const incoming = Array.from(fileList);
      const accepted: StagedImage[] = [];
      let rejected = false;

      for (const file of incoming) {
        if (!ALLOWED_TYPES.includes(file.type)) {
          rejected = true;
          continue;
        }
        if (file.size > MAX_FILE_BYTES) {
          rejected = true;
          continue;
        }
        accepted.push({ file, previewUrl: URL.createObjectURL(file) });
      }

      const combined = [...images, ...accepted];
      const withinLimit = combined.slice(0, MAX_IMAGES);

      if (rejected) {
        setError("بعض الصور تم تجاهلها — يُسمح فقط بـ JPEG/PNG/WEBP/GIF بحد أقصى 5 ميجابايت لكل صورة.");
      } else if (combined.length > MAX_IMAGES) {
        setError(`الحد الأقصى ${MAX_IMAGES} صور — تم إضافة أول ${MAX_IMAGES} فقط.`);
      }

      onChange(withinLimit);
    },
    [images, onChange]
  );

  function handleRemove(index: number) {
    const target = images[index];
    if (target) URL.revokeObjectURL(target.previewUrl);
    onChange(images.filter((_, i) => i !== index));
  }

  return (
    <div dir="rtl">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
        }}
        onClick={() => fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click();
        }}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors ${
          isDragging ? "border-teal-500 bg-teal-50" : "border-border bg-surface-muted hover:bg-white"
        }`}
      >
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          className="mb-2 text-text-400"
        >
          <path d="M12 16V4M12 4l-4 4M12 4l4 4" />
          <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
        </svg>
        <p className="text-sm font-semibold text-navy-950">اسحب الصور هنا أو اضغط للاختيار</p>
        <p className="mt-1 text-xs text-text-400">
          JPEG/PNG/WEBP/GIF، حتى 5 ميجابايت لكل صورة، بحد أقصى {MAX_IMAGES} صور
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_TYPES.join(",")}
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {error && <p className="mt-2 text-xs font-semibold text-red-600">{error}</p>}

      {images.length > 0 && (
        <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-5">
          {images.map((img, index) => (
            <div key={img.previewUrl} className="group relative overflow-hidden rounded-lg border border-border">
              {/* Local object URLs — next/image can't optimize these, and it's a transient preview, not the final delivered asset */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.previewUrl} alt="" className="h-20 w-full object-cover sm:h-24" />
              <button
                type="button"
                onClick={() => handleRemove(index)}
                aria-label="إزالة الصورة"
                className="absolute left-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

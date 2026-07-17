"use client";

import { ImagePlus, Images, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

const DEFAULT_TYPES = ["image/png", "image/jpeg", "image/webp"];

type ImageUploadFieldProps = {
  name: string;
  label: string;
  helpText: string;
  multiple?: boolean;
  maxFiles?: number;
  maxBytesPerFile: number;
  maxTotalBytes?: number;
  existingPreview?: string | null;
  aspect?: "square" | "wide" | "gallery";
  className?: string;
  disabled?: boolean;
  onAccepted?: (files: File[]) => void;
  onCleared?: () => void;
  validateSelection?: (files: File[]) => string | null;
};

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.ceil(bytes / 1024)} KB`;
}

export function ImageUploadField({
  name,
  label,
  helpText,
  multiple = false,
  maxFiles = multiple ? 10 : 1,
  maxBytesPerFile,
  maxTotalBytes,
  existingPreview,
  aspect = "wide",
  className = "",
  disabled = false,
  onAccepted,
  onCleared,
  validateSelection,
}: ImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);

  const previewUrls = useMemo(() => files.map((file) => URL.createObjectURL(file)), [files]);

  useEffect(() => {
    return () => previewUrls.forEach((url) => URL.revokeObjectURL(url));
  }, [previewUrls]);

  const acceptSelection = (input: HTMLInputElement) => {
    const selected = Array.from(input.files ?? []);
    setError(null);

    if (selected.length === 0) {
      setFiles([]);
      onCleared?.();
      return;
    }

    if (selected.length > maxFiles) {
      input.value = "";
      setFiles([]);
      setError(`Choose no more than ${maxFiles} image${maxFiles === 1 ? "" : "s"}.`);
      onCleared?.();
      return;
    }

    const wrongType = selected.find((file) => !DEFAULT_TYPES.includes(file.type));
    if (wrongType) {
      input.value = "";
      setFiles([]);
      setError(`${wrongType.name} is not accepted. Use PNG, JPG or WebP.`);
      onCleared?.();
      return;
    }

    const tooLarge = selected.find((file) => file.size > maxBytesPerFile);
    if (tooLarge) {
      input.value = "";
      setFiles([]);
      setError(`${tooLarge.name} is ${formatBytes(tooLarge.size)}. Maximum size is ${formatBytes(maxBytesPerFile)}.`);
      onCleared?.();
      return;
    }

    const total = selected.reduce((sum, file) => sum + file.size, 0);
    if (maxTotalBytes && total > maxTotalBytes) {
      input.value = "";
      setFiles([]);
      setError(`These images total ${formatBytes(total)}. Maximum total is ${formatBytes(maxTotalBytes)}.`);
      onCleared?.();
      return;
    }

    const customError = validateSelection?.(selected);
    if (customError) {
      input.value = "";
      setFiles([]);
      setError(customError);
      onCleared?.();
      return;
    }

    setFiles(selected);
    onAccepted?.(selected);
  };

  const clearSelection = () => {
    if (inputRef.current) inputRef.current.value = "";
    setFiles([]);
    setError(null);
    onCleared?.();
  };

  const frameClass =
    aspect === "square"
      ? "aspect-square max-w-40"
      : aspect === "gallery"
        ? "min-h-40"
        : "aspect-[16/6] min-h-36";

  return (
    <div className={className}>
      <span className="label flex items-center gap-2"><ImagePlus size={16} /> {label}</span>
      <input
        ref={inputRef}
        name={name}
        type="file"
        accept={DEFAULT_TYPES.join(",")}
        multiple={multiple}
        disabled={disabled}
        className="sr-only"
        onChange={(event) => acceptSelection(event.currentTarget)}
      />

      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        className={`group relative mt-2 w-full overflow-hidden rounded-2xl border border-dashed border-white/20 bg-white/[.035] text-left transition hover:border-cyan/70 hover:bg-cyan/[.05] focus:outline-none focus:ring-2 focus:ring-cyan/60 disabled:cursor-not-allowed disabled:opacity-50 ${frameClass}`}
        aria-label={`Choose ${label.toLowerCase()}`}
      >
        {previewUrls.length > 0 ? (
          aspect === "gallery" && previewUrls.length > 1 ? (
            <div className="grid h-full grid-cols-2 gap-2 p-2 sm:grid-cols-3">
              {previewUrls.slice(0, 6).map((url, index) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={url} src={url} alt={`${label} preview ${index + 1}`} className="h-28 w-full rounded-xl object-cover" />
              ))}
            </div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrls[0]} alt={`${label} preview`} className="absolute inset-0 h-full w-full object-cover" />
          )
        ) : existingPreview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={existingPreview} alt={`Current ${label.toLowerCase()}`} className="absolute inset-0 h-full w-full object-cover" />
        ) : null}

        <span className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
        <span className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 p-4">
          <span className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/15 bg-black/45 text-cyan backdrop-blur">
              {multiple ? <Images size={20} /> : <ImagePlus size={20} />}
            </span>
            <span>
              <strong className="block text-sm text-white">{files.length ? `${files.length} image${files.length === 1 ? "" : "s"} selected` : `Click this image area to choose`}</strong>
              <span className="mt-0.5 block text-xs text-white/65">{helpText}</span>
            </span>
          </span>
          <span className="rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-xs font-bold text-white transition group-hover:border-cyan/50 group-hover:text-cyan">Choose image</span>
        </span>
      </button>

      {files.length > 0 && (
        <button type="button" onClick={clearSelection} className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-red-200 hover:text-red-100">
          <X size={14} /> Clear selected image{files.length === 1 ? "" : "s"}
        </button>
      )}

      {error && <p role="alert" className="mt-2 rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-200">{error}</p>}
    </div>
  );
}

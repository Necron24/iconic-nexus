"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ImagePlus, Trash2 } from "lucide-react";

const ALLOWED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const MAX_TOTAL_UPLOAD_BYTES = 4 * 1024 * 1024;
const MAX_SCREENSHOTS = 10;

type ExistingScreenshot = {
  id: string;
  image_url: string;
};

type ProjectDefaults = {
  name?: string;
  type?: "app" | "game";
  stage?: "prototype" | "alpha" | "beta" | "released";
  platform?: string;
  genre?: string | null;
  short_description?: string;
  description?: string | null;
  testing_url?: string | null;
  known_issues?: string | null;
  icon_url?: string | null;
  cover_url?: string | null;
  is_published?: boolean;
  screenshots?: ExistingScreenshot[];
};

type ProjectFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  submitLabel: string;
  cancelHref: string;
  defaults?: ProjectDefaults;
};

function formatBytes(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(bytes >= 1024 * 1024 ? 1 : 2)} MB`;
}

function validateImage(file: File, label: string): string | null {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return `${label} must be a PNG, JPG or WebP image.`;
  }

  if (file.size > MAX_IMAGE_BYTES) {
    return `${label} is ${formatBytes(file.size)}. The maximum allowed size is 2 MB.`;
  }

  return null;
}

function FilePreview({
  file,
  fallback,
  alt,
  className,
}: {
  file: File | null;
  fallback?: string | null;
  alt: string;
  className: string;
}) {
  const [previewUrl, setPreviewUrl] = useState(fallback || "");

  useEffect(() => {
    if (!file) {
      setPreviewUrl(fallback || "");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file, fallback]);

  return previewUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={previewUrl} alt={alt} className={className} />
  ) : (
    <div className={`${className} grid place-items-center border border-dashed border-white/15 bg-white/5 text-soft`}>
      <ImagePlus size={28} />
    </div>
  );
}

function ScreenshotPreview({ file }: { file: File }) {
  const [url, setUrl] = useState("");

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  if (!url) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={file.name} className="h-36 w-full rounded-xl border border-white/10 object-cover" />
  );
}

export function ProjectForm({ action, submitLabel, cancelHref, defaults = {} }: ProjectFormProps) {
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [screenshots, setScreenshots] = useState<File[]>([]);
  const [removeIcon, setRemoveIcon] = useState(false);
  const [removeCover, setRemoveCover] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);

  function totalUploadBytes(nextIcon: File | null, nextCover: File | null, nextScreenshots: File[]): number {
    return (nextIcon?.size ?? 0) + (nextCover?.size ?? 0) + nextScreenshots.reduce((total, file) => total + file.size, 0);
  }

  function validateTotal(nextIcon: File | null, nextCover: File | null, nextScreenshots: File[]): string | null {
    const total = totalUploadBytes(nextIcon, nextCover, nextScreenshots);
    if (total > MAX_TOTAL_UPLOAD_BYTES) {
      return `The selected new images total ${formatBytes(total)}. Reduce them to 4 MB or less before submitting.`;
    }
    return null;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const totalError = validateTotal(iconFile, coverFile, screenshots);
    if (mediaError || totalError) {
      event.preventDefault();
      setMediaError(mediaError || totalError);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  const selectedTotal = totalUploadBytes(iconFile, coverFile, screenshots);

  return (
    <form action={action} onSubmit={handleSubmit} className="card space-y-6 p-6 md:p-8">
      {mediaError && (
        <div role="alert" className="flex gap-3 rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-100">
          <AlertTriangle className="mt-0.5 shrink-0" size={18} />
          <div>
            <strong className="block">Image not accepted</strong>
            <span className="mt-1 block">{mediaError}</span>
          </div>
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="sm:col-span-2">
          <span className="label">Project name *</span>
          <input name="name" className="field" maxLength={100} required defaultValue={defaults.name ?? ""} placeholder="Example: Jozi Gems 3D" />
        </label>

        <label>
          <span className="label">Project type *</span>
          <select name="type" className="field" defaultValue={defaults.type ?? "game"} required>
            <option value="game">Game</option>
            <option value="app">App</option>
          </select>
        </label>

        <label>
          <span className="label">Development stage *</span>
          <select name="stage" className="field" defaultValue={defaults.stage ?? "alpha"} required>
            <option value="prototype">Prototype</option>
            <option value="alpha">Alpha</option>
            <option value="beta">Beta</option>
            <option value="released">Released</option>
          </select>
        </label>

        <label>
          <span className="label">Platform *</span>
          <input name="platform" className="field" maxLength={60} required defaultValue={defaults.platform ?? ""} placeholder="Android, Web, Windows..." />
        </label>

        <label>
          <span className="label">Genre or category</span>
          <input name="genre" className="field" maxLength={80} defaultValue={defaults.genre ?? ""} placeholder="Puzzle, Productivity, Finance..." />
        </label>

        <label className="sm:col-span-2">
          <span className="label">Short description *</span>
          <input name="shortDescription" className="field" maxLength={220} required defaultValue={defaults.short_description ?? ""} placeholder="A short summary for project cards." />
        </label>

        <label className="sm:col-span-2">
          <span className="label">Full description</span>
          <textarea name="description" className="field min-h-36 resize-y" maxLength={5000} defaultValue={defaults.description ?? ""} placeholder="Describe the app or game and what makes it useful or enjoyable." />
        </label>

        <label className="sm:col-span-2">
          <span className="label">Testing or download link</span>
          <input name="testingUrl" type="url" className="field" defaultValue={defaults.testing_url ?? ""} placeholder="https://..." />
        </label>

        <div>
          <span className="label">Project icon</span>
          <FilePreview file={iconFile} fallback={removeIcon ? null : defaults.icon_url} alt="Icon preview" className="h-28 w-28 rounded-2xl object-cover" />
          <input
            name="iconFile"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="mt-3 block w-full text-sm text-soft file:mr-3 file:rounded-lg file:border-0 file:bg-lime file:px-3 file:py-2 file:font-bold file:text-ink"
            onChange={(event) => {
              const file = event.currentTarget.files?.[0] ?? null;
              if (!file) {
                setIconFile(null);
                setMediaError(null);
                return;
              }

              const error = validateImage(file, "Project icon") || validateTotal(file, coverFile, screenshots);
              if (error) {
                event.currentTarget.value = "";
                setIconFile(null);
                setMediaError(error);
                return;
              }

              setIconFile(file);
              setRemoveIcon(false);
              setMediaError(null);
            }}
          />
          {defaults.icon_url && (
            <label className="mt-3 flex items-center gap-2 text-sm text-soft">
              <input name="removeIcon" type="checkbox" value="true" checked={removeIcon} onChange={(event) => setRemoveIcon(event.target.checked)} className="accent-lime" />
              Remove current icon
            </label>
          )}
          <p className="mt-2 text-xs text-soft">PNG, JPG or WebP. Maximum 2 MB.</p>
        </div>

        <div>
          <span className="label">Cover image</span>
          <FilePreview file={coverFile} fallback={removeCover ? null : defaults.cover_url} alt="Cover preview" className="h-28 w-full rounded-2xl object-cover" />
          <input
            name="coverFile"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="mt-3 block w-full text-sm text-soft file:mr-3 file:rounded-lg file:border-0 file:bg-lime file:px-3 file:py-2 file:font-bold file:text-ink"
            onChange={(event) => {
              const file = event.currentTarget.files?.[0] ?? null;
              if (!file) {
                setCoverFile(null);
                setMediaError(null);
                return;
              }

              const error = validateImage(file, "Cover image") || validateTotal(iconFile, file, screenshots);
              if (error) {
                event.currentTarget.value = "";
                setCoverFile(null);
                setMediaError(error);
                return;
              }

              setCoverFile(file);
              setRemoveCover(false);
              setMediaError(null);
            }}
          />
          {defaults.cover_url && (
            <label className="mt-3 flex items-center gap-2 text-sm text-soft">
              <input name="removeCover" type="checkbox" value="true" checked={removeCover} onChange={(event) => setRemoveCover(event.target.checked)} className="accent-lime" />
              Remove current cover
            </label>
          )}
          <p className="mt-2 text-xs text-soft">Landscape works best. Maximum 2 MB.</p>
        </div>

        {defaults.screenshots?.length ? (
          <div className="sm:col-span-2">
            <span className="label">Current screenshots</span>
            <div className="grid gap-4 sm:grid-cols-2">
              {defaults.screenshots.map((image) => (
                <label key={image.id} className="overflow-hidden rounded-xl border border-white/10 bg-white/5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={image.image_url} alt="Current project screenshot" className="h-40 w-full object-cover" />
                  <span className="flex items-center gap-2 p-3 text-sm text-red-200">
                    <input name="removeScreenshotIds" type="checkbox" value={image.id} className="accent-red-400" />
                    <Trash2 size={15} /> Remove this screenshot
                  </span>
                </label>
              ))}
            </div>
          </div>
        ) : null}

        <div className="sm:col-span-2">
          <span className="label">Add screenshots</span>
          <input
            name="screenshotFiles"
            type="file"
            multiple
            accept="image/png,image/jpeg,image/webp"
            className="block w-full text-sm text-soft file:mr-3 file:rounded-lg file:border-0 file:bg-lime file:px-3 file:py-2 file:font-bold file:text-ink"
            onChange={(event) => {
              const files = Array.from(event.currentTarget.files ?? []);

              if (files.length > MAX_SCREENSHOTS) {
                event.currentTarget.value = "";
                setScreenshots([]);
                setMediaError(`You selected ${files.length} screenshots. Select no more than ${MAX_SCREENSHOTS}.`);
                return;
              }

              const invalid = files.map((file, index) => validateImage(file, `Screenshot ${index + 1}`)).find(Boolean);
              const error = invalid || validateTotal(iconFile, coverFile, files);

              if (error) {
                event.currentTarget.value = "";
                setScreenshots([]);
                setMediaError(error);
                return;
              }

              setScreenshots(files);
              setMediaError(null);
            }}
          />
          <p className="mt-2 text-xs text-soft">Up to 10 images. Maximum 2 MB each and 4 MB total for all newly selected images.</p>

          {selectedTotal > 0 && (
            <p className={`mt-2 text-xs font-bold ${selectedTotal > MAX_TOTAL_UPLOAD_BYTES ? "text-red-300" : "text-cyan"}`}>
              Selected upload total: {formatBytes(selectedTotal)} / 4 MB
            </p>
          )}

          {screenshots.length > 0 && (
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {screenshots.map((file) => (
                <ScreenshotPreview key={`${file.name}-${file.lastModified}-${file.size}`} file={file} />
              ))}
            </div>
          )}
        </div>

        <label className="sm:col-span-2">
          <span className="label">Known issues</span>
          <textarea name="knownIssues" className="field min-h-28 resize-y" maxLength={3000} defaultValue={defaults.known_issues ?? ""} placeholder="List problems testers should know about." />
        </label>
      </div>

      <label className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
        <input name="isPublished" type="checkbox" value="true" defaultChecked={defaults.is_published ?? false} className="mt-1 h-4 w-4 accent-lime" />
        <span>
          <strong className="block">Publish on Discover</strong>
          <span className="mt-1 block text-sm text-soft">Leave this off to keep the project as a private draft.</span>
        </span>
      </label>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Link href={cancelHref} className="btn-secondary">Cancel</Link>
        <button type="submit" disabled={Boolean(mediaError)} className="btn-primary disabled:cursor-not-allowed disabled:opacity-50">
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

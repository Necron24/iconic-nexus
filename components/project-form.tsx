"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Trash2 } from "lucide-react";
import { ImageUploadField } from "@/components/image-upload-field";

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
          <ImageUploadField
            name="iconFile"
            label="Project icon"
            helpText="PNG, JPG or WebP · maximum 2 MB"
            maxBytesPerFile={MAX_IMAGE_BYTES}
            existingPreview={removeIcon ? null : defaults.icon_url}
            aspect="square"
            validateSelection={(files) => validateTotal(files[0] || null, coverFile, screenshots)}
            onAccepted={(files) => {
              setIconFile(files[0] || null);
              setRemoveIcon(false);
              setMediaError(null);
            }}
            onCleared={() => setIconFile(null)}
          />
          {defaults.icon_url && (
            <label className="mt-3 flex items-center gap-2 text-sm text-soft">
              <input name="removeIcon" type="checkbox" value="true" checked={removeIcon} onChange={(event) => setRemoveIcon(event.target.checked)} className="accent-lime" />
              Remove current icon
            </label>
          )}
        </div>

        <div>
          <ImageUploadField
            name="coverFile"
            label="Cover image"
            helpText="Landscape works best · maximum 2 MB"
            maxBytesPerFile={MAX_IMAGE_BYTES}
            existingPreview={removeCover ? null : defaults.cover_url}
            aspect="wide"
            validateSelection={(files) => validateTotal(iconFile, files[0] || null, screenshots)}
            onAccepted={(files) => {
              setCoverFile(files[0] || null);
              setRemoveCover(false);
              setMediaError(null);
            }}
            onCleared={() => setCoverFile(null)}
          />
          {defaults.cover_url && (
            <label className="mt-3 flex items-center gap-2 text-sm text-soft">
              <input name="removeCover" type="checkbox" value="true" checked={removeCover} onChange={(event) => setRemoveCover(event.target.checked)} className="accent-lime" />
              Remove current cover
            </label>
          )}
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

        <ImageUploadField
          name="screenshotFiles"
          label="Add screenshots"
          helpText="Up to 10 images · 2 MB each · 4 MB total with icon and cover"
          multiple
          maxFiles={MAX_SCREENSHOTS}
          maxBytesPerFile={MAX_IMAGE_BYTES}
          maxTotalBytes={MAX_TOTAL_UPLOAD_BYTES}
          aspect="gallery"
          className="sm:col-span-2"
          validateSelection={(files) => validateTotal(iconFile, coverFile, files)}
          onAccepted={(files) => {
            setScreenshots(files);
            setMediaError(null);
          }}
          onCleared={() => setScreenshots([])}
        />

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

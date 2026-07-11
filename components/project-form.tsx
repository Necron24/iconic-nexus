"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ImagePlus, Trash2 } from "lucide-react";

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

function Preview({ file, fallback, alt, className }: { file: File | null; fallback?: string | null; alt: string; className: string }) {
  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : fallback || ""), [file, fallback]);

  return previewUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={previewUrl} alt={alt} className={className} />
  ) : (
    <div className={`${className} grid place-items-center border border-dashed border-white/15 bg-white/5 text-soft`}>
      <ImagePlus size={28} />
    </div>
  );
}

export function ProjectForm({ action, submitLabel, cancelHref, defaults = {} }: ProjectFormProps) {
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [screenshots, setScreenshots] = useState<File[]>([]);
  const [removeIcon, setRemoveIcon] = useState(false);
  const [removeCover, setRemoveCover] = useState(false);

  return (
    <form action={action} className="card space-y-6 p-6 md:p-8">
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
          <Preview file={iconFile} fallback={removeIcon ? null : defaults.icon_url} alt="Icon preview" className="h-28 w-28 rounded-2xl object-cover" />
          <input
            name="iconFile"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="mt-3 block w-full text-sm text-soft file:mr-3 file:rounded-lg file:border-0 file:bg-lime file:px-3 file:py-2 file:font-bold file:text-ink"
            onChange={(event) => {
              setIconFile(event.target.files?.[0] ?? null);
              setRemoveIcon(false);
            }}
          />
          {defaults.icon_url && (
            <label className="mt-3 flex items-center gap-2 text-sm text-soft">
              <input name="removeIcon" type="checkbox" value="true" checked={removeIcon} onChange={(event) => setRemoveIcon(event.target.checked)} className="accent-lime" />
              Remove current icon
            </label>
          )}
          <p className="mt-2 text-xs text-soft">PNG, JPG or WebP. Maximum 5 MB.</p>
        </div>

        <div>
          <span className="label">Cover image</span>
          <Preview file={coverFile} fallback={removeCover ? null : defaults.cover_url} alt="Cover preview" className="h-28 w-full rounded-2xl object-cover" />
          <input
            name="coverFile"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="mt-3 block w-full text-sm text-soft file:mr-3 file:rounded-lg file:border-0 file:bg-lime file:px-3 file:py-2 file:font-bold file:text-ink"
            onChange={(event) => {
              setCoverFile(event.target.files?.[0] ?? null);
              setRemoveCover(false);
            }}
          />
          {defaults.cover_url && (
            <label className="mt-3 flex items-center gap-2 text-sm text-soft">
              <input name="removeCover" type="checkbox" value="true" checked={removeCover} onChange={(event) => setRemoveCover(event.target.checked)} className="accent-lime" />
              Remove current cover
            </label>
          )}
          <p className="mt-2 text-xs text-soft">Landscape works best. Maximum 5 MB.</p>
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
            onChange={(event) => setScreenshots(Array.from(event.target.files ?? []).slice(0, 10))}
          />
          <p className="mt-2 text-xs text-soft">Up to 10 images, maximum 5 MB each.</p>
          {screenshots.length > 0 && (
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {screenshots.map((file) => {
                const url = URL.createObjectURL(file);
                return (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={`${file.name}-${file.lastModified}`} src={url} alt={file.name} className="h-36 w-full rounded-xl border border-white/10 object-cover" />
                );
              })}
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
        <button type="submit" className="btn-primary">{submitLabel}</button>
      </div>
    </form>
  );
}

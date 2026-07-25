"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Check, Eye, Palette, Sparkles } from "lucide-react";
import { ImageUploadField } from "@/components/image-upload-field";
import { SubmitButton } from "@/components/submit-button";
import {
  DEFAULT_DEVLOG_STYLE,
  bodyFontStacks,
  devlogBackground,
  headingFontStacks
} from "@/lib/devlog-style";

type UpdateValues = {
  title?: string;
  body?: string;
  version_label?: string | null;
  update_type?: string;
  image_url?: string | null;
  release_url?: string | null;
  is_published?: boolean;
  accent_color?: string | null;
  background_color?: string | null;
  background_style?: string | null;
  background_image_url?: string | null;
  heading_font?: string | null;
  body_font?: string | null;
  card_style?: string | null;
  layout_style?: string | null;
  text_align?: string | null;
  image_fit?: string | null;
};

const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const MAX_TOTAL_BYTES = 5 * 1024 * 1024;

const typeLabels: Record<string, string> = {
  development: "Development update",
  release: "New release",
  bug_fixes: "Bug fixes",
  testing_needed: "Testing needed",
  major_update: "Major update",
  announcement: "Announcement"
};

function SelectCard({
  name,
  value,
  checked,
  label,
  description,
  onChange
}: {
  name: string;
  value: string;
  checked: boolean;
  label: string;
  description: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className={`relative cursor-pointer rounded-xl border p-3 transition ${checked ? "border-cyan/50 bg-cyan/10" : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"}`}>
      <input className="sr-only" type="radio" name={name} value={value} checked={checked} onChange={() => onChange(value)} />
      {checked && <Check className="absolute right-3 top-3 text-cyan" size={15} />}
      <strong className="block pr-5 text-sm">{label}</strong>
      <span className="mt-1 block text-xs leading-5 text-soft">{description}</span>
    </label>
  );
}

export function UpdateForm({
  action,
  values = {},
  submitLabel,
  cancelHref
}: {
  action: (formData: FormData) => void | Promise<void>;
  values?: UpdateValues;
  submitLabel: string;
  cancelHref: string;
}) {
  const [title, setTitle] = useState(values.title ?? "A fresh look at what we built");
  const [body, setBody] = useState(values.body ?? "Share the progress, decisions and details that bring this update to life.");
  const [version, setVersion] = useState(values.version_label ?? "");
  const [updateType, setUpdateType] = useState(values.update_type ?? "development");
  const [accentColor, setAccentColor] = useState(values.accent_color ?? DEFAULT_DEVLOG_STYLE.accent_color);
  const [backgroundColor, setBackgroundColor] = useState(values.background_color ?? DEFAULT_DEVLOG_STYLE.background_color);
  const [backgroundStyle, setBackgroundStyle] = useState(values.background_style ?? DEFAULT_DEVLOG_STYLE.background_style);
  const [headingFont, setHeadingFont] = useState(values.heading_font ?? DEFAULT_DEVLOG_STYLE.heading_font);
  const [bodyFont, setBodyFont] = useState(values.body_font ?? DEFAULT_DEVLOG_STYLE.body_font);
  const [cardStyle, setCardStyle] = useState(values.card_style ?? DEFAULT_DEVLOG_STYLE.card_style);
  const [layoutStyle, setLayoutStyle] = useState(values.layout_style ?? DEFAULT_DEVLOG_STYLE.layout_style);
  const [textAlign, setTextAlign] = useState(values.text_align ?? DEFAULT_DEVLOG_STYLE.text_align);
  const [imageFit, setImageFit] = useState(values.image_fit ?? DEFAULT_DEVLOG_STYLE.image_fit);
  const [featureFile, setFeatureFile] = useState<File | null>(null);
  const [backgroundFile, setBackgroundFile] = useState<File | null>(null);

  const featurePreview = useMemo(() => featureFile ? URL.createObjectURL(featureFile) : values.image_url ?? null, [featureFile, values.image_url]);
  const backgroundPreview = useMemo(() => backgroundFile ? URL.createObjectURL(backgroundFile) : values.background_image_url ?? null, [backgroundFile, values.background_image_url]);

  useEffect(() => () => {
    if (featureFile && featurePreview) URL.revokeObjectURL(featurePreview);
    if (backgroundFile && backgroundPreview) URL.revokeObjectURL(backgroundPreview);
  }, [backgroundFile, backgroundPreview, featureFile, featurePreview]);

  const previewStyle = {
    accent_color: accentColor,
    background_color: backgroundColor,
    background_style: backgroundStyle,
    background_image_url: backgroundPreview
  };

  const cardClasses = {
    glass: "border-white/15 bg-black/25 backdrop-blur-xl shadow-2xl",
    solid: "border-white/10 bg-[#0B1020] shadow-2xl",
    outline: "border-2 bg-transparent",
    minimal: "border-transparent bg-transparent"
  }[cardStyle] ?? "border-white/15 bg-black/25 backdrop-blur-xl";

  return (
    <form action={action} className="space-y-6">
      <section className="card space-y-5 p-6 md:p-8">
        <div>
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[.22em] text-cyan"><Sparkles size={15} /> Content</p>
          <h3 className="mt-2 text-xl font-black">Tell the story of this update</h3>
        </div>

        <label>
          <span className="label">Update title *</span>
          <input id="title" name="title" className="field" maxLength={120} required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Kasi Runner v0.2 is live" />
        </label>

        <div className="grid gap-5 md:grid-cols-2">
          <label>
            <span className="label">Update type</span>
            <select name="updateType" className="field" value={updateType} onChange={(event) => setUpdateType(event.target.value)}>
              <option value="development">Development update</option>
              <option value="release">New release</option>
              <option value="bug_fixes">Bug fixes</option>
              <option value="testing_needed">Testing needed</option>
              <option value="major_update">Major update</option>
              <option value="announcement">Announcement</option>
            </select>
          </label>
          <label>
            <span className="label">Version (optional)</span>
            <input name="versionLabel" className="field" maxLength={40} value={version} onChange={(event) => setVersion(event.target.value)} placeholder="v0.2.0" />
          </label>
        </div>

        <label>
          <span className="label">Devlog *</span>
          <textarea name="body" className="field min-h-64 resize-y" minLength={10} maxLength={10000} required value={body} onChange={(event) => setBody(event.target.value)} placeholder="Explain what changed, what still needs work, and what feedback you need." />
          <span className="mt-2 block text-right text-xs text-soft">{body.length.toLocaleString()} / 10,000</span>
        </label>

        <div className="grid gap-5 md:grid-cols-2">
          <label>
            <span className="label">Feature image URL (optional)</span>
            <input name="imageUrl" type="url" className="field" defaultValue={values.image_url ?? ""} placeholder="https://..." />
          </label>
          <label>
            <span className="label">Release/download URL (optional)</span>
            <input name="releaseUrl" type="url" className="field" defaultValue={values.release_url ?? ""} placeholder="https://..." />
          </label>
        </div>

        <ImageUploadField
          name="imageFile"
          label="Upload a feature image"
          helpText="PNG, JPG or WebP · maximum 3 MB"
          maxBytesPerFile={MAX_IMAGE_BYTES}
          existingPreview={values.image_url}
          aspect="wide"
          validateSelection={(files) => ((files[0]?.size ?? 0) + (backgroundFile?.size ?? 0) > MAX_TOTAL_BYTES ? "Both new images together may not exceed 5 MB." : null)}
          onAccepted={(files) => setFeatureFile(files[0] ?? null)}
          onCleared={() => setFeatureFile(null)}
        />
        {values.image_url && (
          <label className="flex items-center gap-2 text-sm text-red-200"><input name="removeImage" type="checkbox" value="true" /> Remove the current feature image</label>
        )}
      </section>

      <section className="card space-y-6 p-6 md:p-8">
        <div>
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[.22em] text-cyan"><Palette size={15} /> Design studio</p>
          <h3 className="mt-2 text-xl font-black">Make this devlog your own</h3>
          <p className="mt-2 text-sm text-soft">Choose the fonts, colour, background, card treatment and reading layout.</p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <label>
            <span className="label">Accent colour</span>
            <span className="flex gap-3">
              <input name="accentColor" type="color" value={accentColor} onChange={(event) => setAccentColor(event.target.value)} className="h-12 w-16 cursor-pointer rounded-xl border border-white/10 bg-white/5 p-1" />
              <input value={accentColor.toUpperCase()} onChange={(event) => /^#[0-9a-f]{0,6}$/i.test(event.target.value) && setAccentColor(event.target.value)} className="field font-mono uppercase" aria-label="Accent colour hex value" />
            </span>
          </label>
          <label>
            <span className="label">Background colour</span>
            <span className="flex gap-3">
              <input name="backgroundColor" type="color" value={backgroundColor} onChange={(event) => setBackgroundColor(event.target.value)} className="h-12 w-16 cursor-pointer rounded-xl border border-white/10 bg-white/5 p-1" />
              <input value={backgroundColor.toUpperCase()} onChange={(event) => /^#[0-9a-f]{0,6}$/i.test(event.target.value) && setBackgroundColor(event.target.value)} className="field font-mono uppercase" aria-label="Background colour hex value" />
            </span>
          </label>
        </div>

        <div>
          <span className="label">Background treatment</span>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SelectCard name="backgroundStyle" value="gradient" checked={backgroundStyle === "gradient"} label="Glow gradient" description="Accent glow over your base colour." onChange={setBackgroundStyle} />
            <SelectCard name="backgroundStyle" value="solid" checked={backgroundStyle === "solid"} label="Solid colour" description="Clean and focused." onChange={setBackgroundStyle} />
            <SelectCard name="backgroundStyle" value="image" checked={backgroundStyle === "image"} label="Background image" description="Immersive image with a readable overlay." onChange={setBackgroundStyle} />
            <SelectCard name="backgroundStyle" value="none" checked={backgroundStyle === "none"} label="No background" description="Use the main project page backdrop." onChange={setBackgroundStyle} />
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <label>
            <span className="label">Background image URL (optional)</span>
            <input name="backgroundImageUrl" type="url" className="field" defaultValue={values.background_image_url ?? ""} placeholder="https://..." />
          </label>
          <ImageUploadField
            name="backgroundImageFile"
            label="Upload a background"
            helpText="Landscape image · maximum 3 MB"
            maxBytesPerFile={MAX_IMAGE_BYTES}
            existingPreview={values.background_image_url}
            aspect="wide"
            validateSelection={(files) => ((files[0]?.size ?? 0) + (featureFile?.size ?? 0) > MAX_TOTAL_BYTES ? "Both new images together may not exceed 5 MB." : null)}
            onAccepted={(files) => {
              setBackgroundFile(files[0] ?? null);
              setBackgroundStyle("image");
            }}
            onCleared={() => setBackgroundFile(null)}
          />
        </div>
        {values.background_image_url && (
          <label className="flex items-center gap-2 text-sm text-red-200"><input name="removeBackgroundImage" type="checkbox" value="true" /> Remove the current background image</label>
        )}

        <div className="grid gap-5 md:grid-cols-2">
          <label>
            <span className="label">Heading font</span>
            <select name="headingFont" className="field" value={headingFont} onChange={(event) => setHeadingFont(event.target.value)}>
              <option value="display">Bold display</option>
              <option value="sans">Modern sans</option>
              <option value="serif">Editorial serif</option>
              <option value="mono">Developer mono</option>
              <option value="rounded">Friendly rounded</option>
            </select>
          </label>
          <label>
            <span className="label">Body font</span>
            <select name="bodyFont" className="field" value={bodyFont} onChange={(event) => setBodyFont(event.target.value)}>
              <option value="sans">Clean sans</option>
              <option value="serif">Editorial serif</option>
              <option value="mono">Developer mono</option>
              <option value="humanist">Warm humanist</option>
            </select>
          </label>
        </div>

        <div>
          <span className="label">Card style</span>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SelectCard name="cardStyle" value="glass" checked={cardStyle === "glass"} label="Liquid glass" description="Blurred, luminous and layered." onChange={setCardStyle} />
            <SelectCard name="cardStyle" value="solid" checked={cardStyle === "solid"} label="Solid panel" description="High contrast and easy to read." onChange={setCardStyle} />
            <SelectCard name="cardStyle" value="outline" checked={cardStyle === "outline"} label="Accent outline" description="Lightweight with a coloured edge." onChange={setCardStyle} />
            <SelectCard name="cardStyle" value="minimal" checked={cardStyle === "minimal"} label="Minimal" description="No visible container." onChange={setCardStyle} />
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          <label><span className="label">Layout</span><select name="layoutStyle" className="field" value={layoutStyle} onChange={(event) => setLayoutStyle(event.target.value)}><option value="editorial">Editorial</option><option value="showcase">Visual showcase</option><option value="compact">Compact</option></select></label>
          <label><span className="label">Text alignment</span><select name="textAlign" className="field" value={textAlign} onChange={(event) => setTextAlign(event.target.value)}><option value="left">Left aligned</option><option value="center">Centred</option></select></label>
          <label><span className="label">Feature image fit</span><select name="imageFit" className="field" value={imageFit} onChange={(event) => setImageFit(event.target.value)}><option value="cover">Fill the frame</option><option value="contain">Show full image</option></select></label>
        </div>
      </section>

      <section className="card p-4 md:p-6">
        <p className="mb-4 flex items-center gap-2 text-xs font-black uppercase tracking-[.22em] text-cyan"><Eye size={15} /> Live preview</p>
        <article className="overflow-hidden rounded-3xl p-4 sm:p-7" style={{ background: devlogBackground(previewStyle) }}>
          <div className={`mx-auto overflow-hidden rounded-2xl border ${cardClasses} ${layoutStyle === "compact" ? "max-w-2xl" : "max-w-4xl"}`} style={{ borderColor: cardStyle === "outline" ? accentColor : undefined, textAlign: textAlign as "left" | "center" }}>
            {featurePreview && layoutStyle === "showcase" && <img src={featurePreview} alt="" className={`h-64 w-full ${imageFit === "contain" ? "bg-black/30 object-contain" : "object-cover"}`} />}
            <div className={layoutStyle === "compact" ? "p-5" : "p-6 sm:p-8"}>
              <div className={`flex flex-wrap gap-2 ${textAlign === "center" ? "justify-center" : ""}`}>
                <span className="rounded-full border px-3 py-1 text-xs font-black" style={{ borderColor: `${accentColor}66`, backgroundColor: `${accentColor}18`, color: accentColor }}>{typeLabels[updateType]}</span>
                {version && <span className="badge">{version}</span>}
              </div>
              <h2 className={`${layoutStyle === "compact" ? "mt-3 text-2xl" : "mt-4 text-3xl sm:text-4xl"} font-black`} style={{ color: accentColor, fontFamily: headingFontStacks[headingFont] }}>{title || "Your update title"}</h2>
              {featurePreview && layoutStyle !== "showcase" && <img src={featurePreview} alt="" className={`mt-5 max-h-80 w-full rounded-xl ${imageFit === "contain" ? "bg-black/30 object-contain" : "object-cover"}`} />}
              <p className="mt-5 whitespace-pre-wrap leading-8 text-white/80" style={{ fontFamily: bodyFontStacks[bodyFont] }}>{body || "Your devlog story appears here."}</p>
            </div>
          </div>
        </article>
      </section>

      <label className="card flex items-center gap-3 p-5">
        <input name="isPublished" type="checkbox" value="true" defaultChecked={values.is_published ?? true} className="h-5 w-5 accent-lime" />
        <span><span className="block font-bold">Publish this update</span><span className="text-sm text-soft">Uncheck to keep it privately as a draft. Its publish date is set when it first goes live.</span></span>
      </label>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Link href={cancelHref} className="btn-secondary">Cancel</Link>
        <SubmitButton idleText={submitLabel} pendingText="Saving update…" />
      </div>
    </form>
  );
}

"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Github, Globe2, ImagePlus, MapPin, Palette, Sparkles } from "lucide-react";

const colours = [
  ["lime", "Lime", "#9EFF3A"],
  ["cyan", "Cyan", "#57E6FF"],
  ["violet", "Violet", "#A78BFA"],
  ["amber", "Amber", "#FBBF24"],
  ["rose", "Rose", "#FB7185"],
  ["blue", "Blue", "#60A5FA"]
] as const;

const accentMap: Record<string, string> = Object.fromEntries(colours.map(([value, , hex]) => [value, hex]));

type ProfileData = {
  username: string | null;
  display_name: string | null;
  country: string | null;
  bio: string | null;
  headline: string | null;
  role: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  accent_color: string | null;
  website_url: string | null;
  github_url: string | null;
  social_url: string | null;
};

function useObjectPreview(file: File | null, fallback: string | null) {
  const [preview, setPreview] = useState<string | null>(fallback || null);

  useEffect(() => {
    if (!file) {
      setPreview(fallback || null);
      return;
    }
    const next = URL.createObjectURL(file);
    setPreview(next);
    return () => URL.revokeObjectURL(next);
  }, [file, fallback]);

  return preview;
}

export function ProfileCustomizationForm({
  profile,
  saveAction,
  restartAction
}: {
  profile: ProfileData;
  saveAction: (formData: FormData) => void | Promise<void>;
  restartAction: (formData: FormData) => void | Promise<void>;
}) {
  const [username, setUsername] = useState(profile.username || "");
  const [displayName, setDisplayName] = useState(profile.display_name || profile.username || "");
  const [country, setCountry] = useState(profile.country || "");
  const [bio, setBio] = useState(profile.bio || "");
  const [headline, setHeadline] = useState(profile.headline || "");
  const [role, setRole] = useState(profile.role || "both");
  const [accentColor, setAccentColor] = useState(profile.accent_color || "lime");
  const [websiteUrl, setWebsiteUrl] = useState(profile.website_url || "");
  const [githubUrl, setGithubUrl] = useState(profile.github_url || "");
  const [socialUrl, setSocialUrl] = useState(profile.social_url || "");
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [removeBanner, setRemoveBanner] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);

  const avatarPreview = useObjectPreview(avatarFile, profile.avatar_url);
  const bannerPreview = useObjectPreview(bannerFile, profile.banner_url);
  const effectiveAvatar = removeAvatar ? null : avatarPreview;
  const effectiveBanner = removeBanner ? null : bannerPreview;
  const accent = accentMap[accentColor] || accentMap.lime;
  const previewName = displayName.trim() || username.trim() || "Iconic Creator";
  const previewUsername = username.trim() || "your_username";
  const previewHeadline = headline.trim() || "Your headline will appear here.";
  const previewBio = bio.trim() || "Tell people what you build, what devices you test on and the kind of feedback you give. Your bio preview will update as you type.";
  const previewRole = role === "both" ? "tester and developer" : role;
  const style = useMemo(() => ({ "--profile-accent": accent } as CSSProperties), [accent]);

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <p className="text-sm font-bold uppercase tracking-[.2em] text-cyan">Account and public page</p>
        <h2 className="mt-2 text-3xl font-black">Customize your profile</h2>
        <p className="mt-2 text-soft">Choose how your public creator/tester page looks and what visitors can learn about you.</p>
      </div>

      <form id="profile-form" action={saveAction} className="space-y-5">
        <input type="hidden" name="currentAvatar" value={profile.avatar_url || ""} />
        <input type="hidden" name="currentBanner" value={profile.banner_url || ""} />

        <section
          className="card overflow-hidden transition-all"
          style={{
            ...style,
            borderColor: `${accent}66`,
            boxShadow: `0 0 0 1px ${accent}22, 0 0 40px ${accent}16`
          }}
        >
          <div className="relative h-52 overflow-hidden border-b border-white/10 bg-[#091225] md:h-64">
            {effectiveBanner ? (
              <img src={effectiveBanner} alt="Profile banner preview" className="h-full w-full object-cover" />
            ) : (
              <div
                className="h-full w-full"
                style={{
                  background: `radial-gradient(circle at 18% 22%, ${accent}55, transparent 28%), radial-gradient(circle at 82% 22%, ${accent}22, transparent 22%), linear-gradient(135deg, #16233b, #071127 68%)`
                }}
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0c1323] via-[#0c132380] to-transparent" />
            <div className="absolute inset-x-0 bottom-0 h-1" style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }} />
            <div className="absolute left-5 right-5 top-5 flex flex-wrap items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[.2em] text-white/90" style={{ borderColor: `${accent}66`, background: `${accent}14` }}>
                <Sparkles size={14} style={{ color: accent }} /> Live preview
              </span>
              <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-white/70">Public page preview</span>
            </div>
            <div className="absolute inset-x-0 bottom-0 flex items-end gap-4 p-5 md:p-6">
              {effectiveAvatar ? (
                <img src={effectiveAvatar} alt="Profile avatar preview" className="h-24 w-24 rounded-3xl border-4 border-[#11192b] object-cover shadow-2xl md:h-28 md:w-28" />
              ) : (
                <div className="grid h-24 w-24 place-items-center rounded-3xl border-4 border-[#11192b] text-3xl font-black text-ink shadow-2xl md:h-28 md:w-28 md:text-4xl" style={{ backgroundColor: accent }}>
                  {previewName[0]?.toUpperCase() || "I"}
                </div>
              )}
              <div className="max-w-2xl pb-1">
                <p className="text-sm font-bold uppercase tracking-[.2em]" style={{ color: accent }}>{previewRole}</p>
                <h3 className="mt-1 text-2xl font-black md:text-4xl">{previewName}</h3>
                <p className="mt-1 text-sm text-white/75 md:text-base">@{previewUsername}</p>
                <p className="mt-3 max-w-2xl text-sm font-semibold md:text-lg" style={{ color: accent }}>{previewHeadline}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-6 p-6 lg:grid-cols-[1.2fr_.8fr]">
            <div>
              <p className="text-sm text-soft">{previewBio}</p>
              <div className="mt-4 flex flex-wrap gap-2 text-sm text-soft">
                {country && <span className="badge gap-2"><MapPin size={14} />{country}</span>}
                {websiteUrl && <span className="badge gap-2"><Globe2 size={14} />Website</span>}
                {githubUrl && <span className="badge gap-2"><Github size={14} />GitHub</span>}
                {socialUrl && <span className="badge gap-2"><ExternalLink size={14} />Social link</span>}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              <div className="rounded-2xl border bg-white/5 p-4" style={{ borderColor: `${accent}44` }}>
                <p className="text-xs uppercase tracking-[.2em] text-soft">Projects</p>
                <p className="mt-2 text-2xl font-black" style={{ color: accent }}>Portfolio</p>
              </div>
              <div className="rounded-2xl border bg-white/5 p-4" style={{ borderColor: `${accent}44` }}>
                <p className="text-xs uppercase tracking-[.2em] text-soft">Reputation</p>
                <p className="mt-2 text-2xl font-black" style={{ color: accent }}>4.8</p>
              </div>
              <div className="rounded-2xl border bg-white/5 p-4" style={{ borderColor: `${accent}44` }}>
                <p className="text-xs uppercase tracking-[.2em] text-soft">Accent</p>
                <div className="mt-2 flex items-center gap-2"><span className="h-5 w-5 rounded-full border border-white/20" style={{ backgroundColor: accent }} /><span className="font-bold">{colours.find(([value]) => value === accentColor)?.[1] || "Lime"}</span></div>
              </div>
            </div>
          </div>
        </section>

        <section className="card grid gap-5 p-6 md:grid-cols-2">
          <label>
            <span className="label flex items-center gap-2"><ImagePlus size={16} /> Profile image</span>
            <input
              name="avatar"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="field"
              onChange={(e) => {
                const file = e.currentTarget.files?.[0] || null;
                setAvatarFile(file);
                if (file) setRemoveAvatar(false);
              }}
            />
            <span className="mt-2 block text-xs text-soft">PNG, JPG or WebP · maximum 3 MB</span>
            {(profile.avatar_url || avatarFile) && (
              <label className="mt-3 flex items-center gap-2 text-sm text-soft">
                <input type="checkbox" name="removeAvatar" checked={removeAvatar} onChange={(e) => setRemoveAvatar(e.currentTarget.checked)} />
                Remove current avatar
              </label>
            )}
          </label>
          <label>
            <span className="label flex items-center gap-2"><ImagePlus size={16} /> Page banner</span>
            <input
              name="banner"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="field"
              onChange={(e) => {
                const file = e.currentTarget.files?.[0] || null;
                setBannerFile(file);
                if (file) setRemoveBanner(false);
              }}
            />
            <span className="mt-2 block text-xs text-soft">Wide image recommended · maximum 5 MB</span>
            {(profile.banner_url || bannerFile) && (
              <label className="mt-3 flex items-center gap-2 text-sm text-soft">
                <input type="checkbox" name="removeBanner" checked={removeBanner} onChange={(e) => setRemoveBanner(e.currentTarget.checked)} />
                Remove current banner
              </label>
            )}
          </label>
        </section>

        <section className="card grid gap-5 p-6 sm:grid-cols-2">
          <label><span className="label">Username</span><input name="username" required value={username} onChange={(e) => setUsername(e.target.value)} className="field" /></label>
          <label><span className="label">Display name</span><input name="displayName" maxLength={80} value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="field" /></label>
          <label className="sm:col-span-2"><span className="label">Profile headline</span><input name="headline" maxLength={120} value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="Indie developer, Android tester and puzzle-game fan" className="field" /></label>
          <label><span className="label">Country</span><input name="country" value={country} onChange={(e) => setCountry(e.target.value)} className="field" /></label>
          <label><span className="label">Role</span><select name="role" value={role} onChange={(e) => setRole(e.target.value)} className="field"><option value="both">Tester and developer</option><option value="tester">Tester</option><option value="developer">Developer</option></select></label>
          <label className="sm:col-span-2"><span className="label">About you</span><textarea name="bio" maxLength={1000} rows={6} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell people what you build, what devices you can test on and what kind of feedback you give." className="field" /></label>
        </section>

        <section className="card p-6" style={{ borderColor: `${accent}55`, boxShadow: `0 0 28px ${accent}10` }}>
          <h3 className="flex items-center gap-2 text-xl font-black"><Palette size={20} style={{ color: accent }} /> Page accent colour</h3>
          <p className="mt-2 text-sm text-soft">This colour is used on your public page highlights and buttons.</p>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
            {colours.map(([value, label, hex]) => (
              <label key={value} className="cursor-pointer">
                <input type="radio" name="accentColor" value={value} checked={accentColor === value} onChange={() => setAccentColor(value)} className="peer sr-only" />
                <span
                  className="flex items-center gap-2 rounded-xl border p-3 transition"
                  style={accentColor === value ? { borderColor: hex, backgroundColor: `${hex}22`, boxShadow: `0 0 18px ${hex}22` } : { borderColor: 'rgba(255,255,255,.10)' }}
                >
                  <span className="h-5 w-5 rounded-full" style={{ backgroundColor: hex }} />
                  <span className="text-sm font-semibold">{label}</span>
                </span>
              </label>
            ))}
          </div>
        </section>

        <section className="card grid gap-5 p-6 sm:grid-cols-2">
          <label><span className="label">Website</span><input name="websiteUrl" type="url" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="https://yourwebsite.com" className="field" /></label>
          <label><span className="label">GitHub</span><input name="githubUrl" type="url" value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)} placeholder="https://github.com/username" className="field" /></label>
          <label className="sm:col-span-2"><span className="label">Other social/profile link</span><input name="socialUrl" type="url" value={socialUrl} onChange={(e) => setSocialUrl(e.target.value)} placeholder="https://..." className="field" /></label>
        </section>
      </form>

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          form="profile-form"
          className="inline-flex items-center justify-center rounded-xl px-5 py-3 font-bold text-ink transition hover:scale-[1.02] hover:brightness-110"
          style={{ backgroundColor: accent, boxShadow: `0 0 24px ${accent}33` }}
        >
          Save profile and page
        </button>
        <Link href={`/profiles/${previewUsername}`} className="btn-secondary gap-2">View public profile <ExternalLink size={16} /></Link>
        <Link href="/help" className="btn-secondary">Profile help</Link>
        <form action={restartAction}>
          <button className="btn-secondary" type="submit">Restart introduction</button>
        </form>
      </div>
    </div>
  );
}

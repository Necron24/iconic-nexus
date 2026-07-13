"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { validateImageFile } from "@/lib/security/image-file";

const allowed = new Set(["image/png", "image/jpeg", "image/webp"]);
const accents = new Set(["lime", "cyan", "violet", "amber", "rose", "blue"]);

function fail(message: string): never {
  redirect(`/dashboard/profile?error=${encodeURIComponent(message)}`);
}

function safeUrl(value: string) {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

async function uploadProfileImage({ supabase, userId, file, kind, maxBytes }: { supabase: Awaited<ReturnType<typeof createClient>>; userId: string; file: File; kind: string; maxBytes: number; }) {
  try { await validateImageFile(file, maxBytes, kind); } catch (error) { fail(error instanceof Error ? error.message : `${kind} is invalid.`); }
  const ext = (file.name.split('.').pop() || 'jpg').replace(/[^a-z0-9]/gi, '');
  const path = `${userId}/${kind.toLowerCase().replace(/\s+/g, '-')}-${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from('profile-media').upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type });
  if (error) fail(error.message);
  return supabase.storage.from('profile-media').getPublicUrl(path).data.publicUrl;
}

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const username = String(formData.get('username') || '').trim();
  const displayName = String(formData.get('displayName') || '').trim();
  const country = String(formData.get('country') || '').trim();
  const bio = String(formData.get('bio') || '').trim();
  const headline = String(formData.get('headline') || '').trim();
  const role = String(formData.get('role') || 'both');
  const accentColor = String(formData.get('accentColor') || 'lime');
  const websiteInput = String(formData.get('websiteUrl') || '').trim();
  const githubInput = String(formData.get('githubUrl') || '').trim();
  const socialInput = String(formData.get('socialUrl') || '').trim();

  if (!/^[A-Za-z0-9_]{3,30}$/.test(username)) fail('Username must be 3–30 characters and use only letters, numbers or underscores.');
  if (displayName.length > 80) fail('Display name is too long.');
  if (headline.length > 120) fail('Headline may not exceed 120 characters.');
  if (bio.length > 1000) fail('Bio may not exceed 1000 characters.');
  if (!['tester', 'developer', 'both'].includes(role)) fail('Choose a valid role.');
  if (!accents.has(accentColor)) fail('Choose a valid accent colour.');

  const websiteUrl = safeUrl(websiteInput);
  const githubUrl = safeUrl(githubInput);
  const socialUrl = safeUrl(socialInput);
  if (websiteInput && !websiteUrl) fail('Website URL is invalid.');
  if (githubInput && !githubUrl) fail('GitHub URL is invalid.');
  if (socialInput && !socialUrl) fail('Social link is invalid.');

  let avatarUrl: string | null = String(formData.get('currentAvatar') || '') || null;
  let bannerUrl: string | null = String(formData.get('currentBanner') || '') || null;
  const avatar = formData.get('avatar');
  const banner = formData.get('banner');
  const removeAvatar = formData.get('removeAvatar') === 'on';
  const removeBanner = formData.get('removeBanner') === 'on';

  if (removeAvatar) avatarUrl = null;
  if (removeBanner) bannerUrl = null;
  if (avatar instanceof File && avatar.size > 0) avatarUrl = await uploadProfileImage({ supabase, userId: user.id, file: avatar, kind: 'Avatar', maxBytes: 3 * 1024 * 1024 });
  if (banner instanceof File && banner.size > 0) bannerUrl = await uploadProfileImage({ supabase, userId: user.id, file: banner, kind: 'Banner', maxBytes: 5 * 1024 * 1024 });

  const { error } = await supabase.from('profiles').update({
    username,
    display_name: displayName || username,
    country: country || null,
    bio: bio || null,
    headline: headline || null,
    role,
    avatar_url: avatarUrl,
    banner_url: bannerUrl,
    accent_color: accentColor,
    website_url: websiteUrl,
    github_url: githubUrl,
    social_url: socialUrl,
    updated_at: new Date().toISOString()
  }).eq('id', user.id);

  if (error) fail(error.message);
  revalidatePath('/', 'layout');
  revalidatePath(`/profiles/${username}`);
  redirect('/dashboard/profile?success=Profile%20and%20page%20updated%20successfully.');
}

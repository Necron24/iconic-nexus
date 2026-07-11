import type { MetadataRoute } from 'next';
import { createClient } from '@/lib/supabase/server';
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const supabase = await createClient();
  const [{ data: projects }, { data: profiles }] = await Promise.all([
    supabase.from('projects').select('slug,updated_at').eq('is_published', true),
    supabase.from('profiles').select('username,updated_at')
  ]);
  return [
    { url: base, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/discover`, lastModified: new Date(), changeFrequency: 'daily', priority: .9 },
    { url: `${base}/campaigns`, lastModified: new Date(), changeFrequency: 'daily', priority: .9 },
    { url: `${base}/help`, lastModified: new Date(), changeFrequency: 'monthly', priority: .7 },
    { url: `${base}/privacy`, lastModified: new Date(), changeFrequency: 'yearly', priority: .2 },
    { url: `${base}/terms`, lastModified: new Date(), changeFrequency: 'yearly', priority: .2 },
    ...(projects || []).map(p => ({ url: `${base}/projects/${p.slug}`, lastModified: new Date(p.updated_at), changeFrequency: 'weekly' as const, priority: .7 })),
    ...(profiles || []).map(p => ({ url: `${base}/profiles/${p.username}`, lastModified: new Date(p.updated_at), changeFrequency: 'monthly' as const, priority: .5 }))
  ];
}

import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = (
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://nexus.iconicapps.co.za"
  ).replace(/\/$/, "");

  const supabase = await createClient();

  const [{ data: projects }, { data: profiles }] = await Promise.all([
    supabase
      .from("projects")
      .select("slug, updated_at")
      .eq("is_published", true)
      .eq("moderation_status", "visible")
      .not("slug", "is", null),

    supabase
      .from("profiles")
      .select("username, updated_at")
      .not("username", "is", null)
      .neq("username", "")
  ]);

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1
    },
    {
      url: `${baseUrl}/discover`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9
    },
    {
      url: `${baseUrl}/campaigns`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9
    },
    {
      url: `${baseUrl}/wall-of-fame`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8
    },
    {
      url: `${baseUrl}/help`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.2
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.2
    },

    ...(projects ?? []).map((project) => ({
      url: `${baseUrl}/projects/${project.slug}`,
      lastModified: project.updated_at
        ? new Date(project.updated_at)
        : new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.7
    })),

    ...(profiles ?? []).map((profile) => ({
      url: `${baseUrl}/profiles/${profile.username}`,
      lastModified: profile.updated_at
        ? new Date(profile.updated_at)
        : new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.5
    }))
  ];
}
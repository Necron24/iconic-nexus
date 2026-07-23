import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateProfile } from "./actions";
import { restartOnboarding } from "@/app/dashboard/onboarding/actions";
import { ProfileCustomizationForm } from "@/components/profile-customization-form";

export default async function ProfileSettingsPage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: p } = await supabase
    .from('profiles')
    .select('username,display_name,country,bio,headline,role,avatar_url,banner_url,accent_color,website_url,github_url,social_url,profile_theme,profile_card_style,banner_overlay,avatar_shape,profile_button_style,profile_layout,show_website,show_github,show_social,show_projects,show_reputation,show_badges,show_testing_stats')
    .eq('id', user.id)
    .single();

  return <>
    {params.error && <div className="mb-5 rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-red-200">{params.error}</div>}
    {params.success && <div className="mb-5 rounded-xl border border-lime/30 bg-lime/10 p-4 text-lime">{params.success}</div>}
    <ProfileCustomizationForm profile={p || {
      username: '', display_name: '', country: '', bio: '', headline: '', role: 'both', avatar_url: '', banner_url: '', accent_color: 'lime', website_url: '', github_url: '', social_url: '', profile_theme: 'default', profile_card_style: 'rounded', banner_overlay: 'gradient', avatar_shape: 'rounded', profile_button_style: 'solid', profile_layout: 'standard', show_website: true, show_github: true, show_social: true, show_projects: true, show_reputation: true, show_badges: true, show_testing_stats: true
    }} saveAction={updateProfile} restartAction={restartOnboarding} />
  </>;
}

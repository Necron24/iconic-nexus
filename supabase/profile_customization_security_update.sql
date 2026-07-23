begin;

alter table public.profiles add column if not exists profile_theme text not null default 'default';
alter table public.profiles add column if not exists profile_card_style text not null default 'rounded';
alter table public.profiles add column if not exists banner_overlay text not null default 'gradient';
alter table public.profiles add column if not exists avatar_shape text not null default 'rounded';
alter table public.profiles add column if not exists profile_button_style text not null default 'solid';
alter table public.profiles add column if not exists profile_layout text not null default 'standard';
alter table public.profiles add column if not exists show_website boolean not null default true;
alter table public.profiles add column if not exists show_github boolean not null default true;
alter table public.profiles add column if not exists show_social boolean not null default true;
alter table public.profiles add column if not exists show_projects boolean not null default true;
alter table public.profiles add column if not exists show_reputation boolean not null default true;
alter table public.profiles add column if not exists show_badges boolean not null default true;
alter table public.profiles add column if not exists show_testing_stats boolean not null default true;

alter table public.profiles drop constraint if exists profiles_accent_color_check;
alter table public.profiles add constraint profiles_accent_color_check check (accent_color in ('lime','cyan','violet','amber','rose','blue','emerald','orange','red','pink','indigo','teal'));
alter table public.profiles drop constraint if exists profiles_profile_theme_check;
alter table public.profiles add constraint profiles_profile_theme_check check (profile_theme in ('default','neon','glass','minimal','dark_pro'));
alter table public.profiles drop constraint if exists profiles_profile_card_style_check;
alter table public.profiles add constraint profiles_profile_card_style_check check (profile_card_style in ('rounded','compact','glass','borderless'));
alter table public.profiles drop constraint if exists profiles_banner_overlay_check;
alter table public.profiles add constraint profiles_banner_overlay_check check (banner_overlay in ('gradient','dark','blur','none'));
alter table public.profiles drop constraint if exists profiles_avatar_shape_check;
alter table public.profiles add constraint profiles_avatar_shape_check check (avatar_shape in ('rounded','circle','hexagon'));
alter table public.profiles drop constraint if exists profiles_profile_button_style_check;
alter table public.profiles add constraint profiles_profile_button_style_check check (profile_button_style in ('solid','outline','glass'));
alter table public.profiles drop constraint if exists profiles_profile_layout_check;
alter table public.profiles add constraint profiles_profile_layout_check check (profile_layout in ('standard','creator'));

revoke update on public.profiles from anon, authenticated;
grant update (username,display_name,avatar_url,bio,country,role,updated_at,banner_url,headline,accent_color,website_url,github_url,social_url,onboarding_completed,accepted_terms_at,profile_theme,profile_card_style,banner_overlay,avatar_shape,profile_button_style,profile_layout,show_website,show_github,show_social,show_projects,show_reputation,show_badges,show_testing_stats) on public.profiles to authenticated;

commit;

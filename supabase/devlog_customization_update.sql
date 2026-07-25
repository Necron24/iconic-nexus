-- Iconic Nexus custom devlog design studio and direct media uploads.
-- Run after supabase/devlogs_and_fame_update.sql.

begin;

alter table public.project_updates
  add column if not exists accent_color text not null default '#57E6FF',
  add column if not exists background_color text not null default '#111827',
  add column if not exists background_style text not null default 'gradient',
  add column if not exists background_image_url text,
  add column if not exists heading_font text not null default 'display',
  add column if not exists body_font text not null default 'sans',
  add column if not exists card_style text not null default 'glass',
  add column if not exists layout_style text not null default 'editorial',
  add column if not exists text_align text not null default 'left',
  add column if not exists image_fit text not null default 'cover',
  add column if not exists published_at timestamptz;

update public.project_updates
set published_at = coalesce(published_at, created_at)
where is_published = true;

alter table public.project_updates
  drop constraint if exists project_updates_accent_color_check,
  drop constraint if exists project_updates_background_color_check,
  drop constraint if exists project_updates_background_style_check,
  drop constraint if exists project_updates_heading_font_check,
  drop constraint if exists project_updates_body_font_check,
  drop constraint if exists project_updates_card_style_check,
  drop constraint if exists project_updates_layout_style_check,
  drop constraint if exists project_updates_text_align_check,
  drop constraint if exists project_updates_image_fit_check;

alter table public.project_updates
  add constraint project_updates_accent_color_check
    check (accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  add constraint project_updates_background_color_check
    check (background_color ~ '^#[0-9A-Fa-f]{6}$'),
  add constraint project_updates_background_style_check
    check (background_style in ('gradient','solid','image','none')),
  add constraint project_updates_heading_font_check
    check (heading_font in ('display','sans','serif','mono','rounded')),
  add constraint project_updates_body_font_check
    check (body_font in ('sans','serif','mono','humanist')),
  add constraint project_updates_card_style_check
    check (card_style in ('glass','solid','outline','minimal')),
  add constraint project_updates_layout_style_check
    check (layout_style in ('editorial','showcase','compact')),
  add constraint project_updates_text_align_check
    check (text_align in ('left','center')),
  add constraint project_updates_image_fit_check
    check (image_fit in ('cover','contain'));

create index if not exists project_updates_published_at_idx
  on public.project_updates(project_id, published_at desc)
  where is_published = true;

-- Existing owner-folder storage policies already protect these objects.
-- Devlog files are stored below:
-- {user_id}/{project_id}/devlogs/{feature|background}/{file}
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'project-media',
  'project-media',
  true,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

commit;

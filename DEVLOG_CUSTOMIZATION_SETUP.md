# Devlog Customization Setup

The code in this project includes the Iconic Nexus devlog design studio.

## Public discovery

Published updates now load at `/devlogs`. The Devlogs link appears in both the
desktop and mobile menus. Visitors can search updates, filter by update type,
change the date order and open the related project's devlog section.

The community experience also includes:

- short feed previews and full devlog detail pages;
- reactions, comments and one-level replies;
- saved devlogs in the user dashboard;
- project following and new-devlog notifications;
- sharing, reporting and testing-campaign calls to action;
- owner/admin comment moderation.

## One-time Supabase update

Run this file in the Supabase SQL Editor before deploying the new code:

```text
supabase/devlog_customization_update.sql
```

Then run:

```text
supabase/devlog_community_update.sql
```

Finally run:

```text
supabase/creator_analytics_update.sql
```

Add a long random server-only value in Vercel:

```text
ANALYTICS_HASH_SALT=your-long-random-secret
```

Creator analytics includes privacy-safe impressions, views, unique visitors,
link clicks, shares, saves, follows, reactions, comments, campaign joins,
conversion funnels, traffic sources, time-series charts and top-content tables.
Free accounts receive 30 days, Pro 90 days and Studio one year plus CSV exports.

It adds:

- publish dates;
- accent and background colours;
- optional background images;
- heading and body font choices;
- glass, solid, outline and minimal cards;
- editorial, showcase and compact layouts;
- text alignment and image-fit settings.

Devlog feature and background images use the existing `project-media` bucket
inside the signed-in creator's protected project folder.

## Included safety fix

Campaign create and manage pages now stop waiting after three seconds if the
plan lookup is unavailable. They safely fall back to Free while preserving an
existing private campaign's private state.

## Verification completed

```text
npx tsc --noEmit
npm run build
```

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

Then run the detailed analytics and content-management update:

```text
supabase/detailed_analytics_archive_update.sql
```

Finally run the following, notifications and personalised discovery update:

```text
supabase/following_personal_discovery_update.sql
```

Add a long random server-only value in Vercel:

```text
ANALYTICS_HASH_SALT=your-long-random-secret
```

Creator analytics includes privacy-safe impressions, views, unique visitors,
link clicks, shares, saves, follows, reactions, comments, campaign joins,
conversion funnels, traffic sources, time-series charts and top-content tables.
Free accounts receive 30 days, Pro 90 days and Studio one year plus CSV exports.

The detailed dashboard separates profile, project, devlog and campaign results.
It adds visitors, clicks, shares, engagement and campaign conversion at listing
level, plus profile-page tracking and a more complete Studio CSV export.

## Content manager

Creators can open `/dashboard/content` to search, filter and sort all their
projects, devlogs and campaigns. They can:

- archive active listings without losing their data;
- restore archived listings with their previous public/private state;
- permanently delete content after a clear confirmation;
- keep historical campaign/tester/credit records safe, because permanent
  deletion is blocked when those records exist;
- remove associated project-media files when an eligible listing is deleted.

Archived content is removed from public discovery. Existing joined testers keep
their testing history, and creators can continue managing archived records.

## Following and personalised discovery

Users can now follow creators, follow projects and watch individual campaigns.
These are managed together at `/dashboard/following`. Follow controls appear on
public profiles, project pages, campaign pages and project cards in Discover.

The notification page includes following/community/testing/credit filters,
unread-only mode, clear-read controls and notification preferences. Followers
receive creator project, devlog and public campaign updates; campaign watchers
receive campaign status and deadline changes.

Signed-in Discover results are prioritised from followed creators, followed
projects, preferred platforms and previous testing activity. The dashboard
onboarding checklist now verifies real profile, follow, project, devlog,
campaign and approved-test progress.

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

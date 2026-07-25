# Devlog Customization Setup

The code in this project includes the Iconic Nexus devlog design studio.

## One-time Supabase update

Run this file in the Supabase SQL Editor before deploying the new code:

```text
supabase/devlog_customization_update.sql
```

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

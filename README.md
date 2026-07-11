# Iconic Nexus

Iconic Nexus is a community-powered indie app and game testing exchange.

## Authentication now included

- Supabase email/password registration
- Username, display name, country and role metadata
- Email confirmation callback
- Login and logout
- Cookie-based SSR sessions
- Protected dashboard routes
- Logged-in header state
- Automatic profile creation and 50 welcome Nexus Credits

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Add these values to `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_YOUR_KEY
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## Supabase setup

1. Open Supabase SQL Editor.
2. Run `supabase/schema.sql` on a fresh project.
3. In Authentication → URL Configuration, set Site URL to `http://localhost:3000` while developing.
4. Add `http://localhost:3000/**` to Redirect URLs.
5. In Authentication → Providers → Email, leave Email enabled.
6. Restart the Next.js dev server after changing `.env.local`.

## Test registration

1. Open `http://localhost:3000/register`.
2. Create an account.
3. Open the confirmation email.
4. You should be redirected to `/dashboard`.
5. Check Supabase Authentication → Users and Table Editor → profiles.

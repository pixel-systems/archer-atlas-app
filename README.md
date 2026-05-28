# Archer Atlas

Modern web UI that mirrors public data from [slz.sk](https://slz.sk) (Slovenský lukostrelecký zväz):
members, clubs, competition results, and WA/SLZ awards.

- **Stack:** Next.js 15 (App Router) · React 19 · TypeScript · Tailwind v4 · Supabase (Postgres + OIDC) · Vercel
- **Auth:** Google / Facebook / Apple via Supabase OAuth
- **Scraping:** `cheerio` for HTML, scheduled nightly with Vercel Cron + on-demand admin trigger

## Local development

### 1. Supabase project

1. Create a project at <https://supabase.com>.
2. In **SQL editor**, paste and run `supabase/migrations/20260528_init.sql`.
3. In **Authentication → Providers**, enable Google, Facebook, and Apple. Configure the redirect URL `http(s)://YOUR_HOST/auth/callback`.
4. Grant yourself admin role (replace the UUID):

   ```sql
   insert into public.app_roles (user_id, role) values ('YOUR-AUTH-UUID', 'admin');
   ```

### 2. Environment

```bash
cp .env.example .env.local
# fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
# SUPABASE_SERVICE_ROLE_KEY, CRON_SECRET, NEXT_PUBLIC_SITE_URL
```

### 3. Run

```bash
npm install
npm run dev
```

Open <http://localhost:3000>.

### 4. Trigger the first scrape

Sign in, then visit `/admin/scraping` → **Všetko**.

## Deployment

Deploy to Vercel and set the same env vars in the dashboard. The `vercel.json` cron entry will fire `/api/cron/scrape` nightly at 03:00 UTC using `CRON_SECRET`.

## Layout

```
src/
  app/
    (public)/{members,clubs,results,awards}   # public browse
    (auth)/login                              # OAuth providers
    auth/callback                             # Supabase OAuth callback
    profile/                                  # signed-in: edit + claim
    admin/{scraping,claims}                   # admin-only
    api/cron/scrape                           # Vercel Cron entry
    api/admin/scrape                          # on-demand
  lib/
    supabase/{browser,server,admin,types}
    auth/roles
    scrapers/{http,text,members,awards,results-index,run}
supabase/migrations/                          # initial schema + RLS
```

## Data sources

| Page                                | Format    | Scraper                        |
| ----------------------------------- | --------- | ------------------------------ |
| `slz.sk/clenovia/`                  | HTML      | `scrapers/members.ts`          |
| `slz.sk/ocenenia/index.php`         | HTML      | `scrapers/awards.ts`           |
| `slz.sk/index.php/results` + archív | HTML idx  | `scrapers/results-index.ts`    |
| Result files (`*.pdf`)              | PDF       | _Phase 7 — not yet implemented_ |

PDF parsing is intentionally deferred: layouts vary wildly. Until then the results page links straight to the original PDF.

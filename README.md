# Dansom Bid Radar

A private web app that lists tenders, RFPs and consultancies Dansom Research & Consultancy can bid for. It ranks them by fit with Dansom's services and puts Somalia first, with Kenya and Ethiopia included. The team marks each item as Pursue, Submitted or Skip.

## How it works

- **Web app**: Next.js (App Router) on Vercel. One shared team password protects every page (`proxy.ts` and `lib/session.ts`).
- **Database**: Supabase Postgres (`supabase/migrations`). Tables are locked with RLS. The app reads and writes only through key-checked database functions (`lib/radar.ts`).
- **Daily sweep**: every morning a scheduled Claude routine checks the tender sources and adds new opportunities to the database. It then emails a digest to the team. The sources, scoring rules and steps are in [`docs/daily-sweep.md`](docs/daily-sweep.md), and the search profile is in [`docs/search-profile.md`](docs/search-profile.md).

## Environment variables

| Name | What it is |
|---|---|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase publishable (anon) key, used on the server only |
| `BID_RADAR_APP_KEY` | Shared key stored in `public.app_secret`, checked by the database functions |
| `SITE_PASSWORD` | Team login password |
| `SESSION_SECRET` | Random string used to sign the login cookie |

Copy `.env.example` to `.env.local` for local development, then run:

```bash
npm install
npm run dev
```

## Changing the password

Update `SITE_PASSWORD` in the Vercel project settings, then redeploy. To sign everyone out, also change `SESSION_SECRET`.

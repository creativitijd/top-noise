# Top Noise

AI-powered social media op autopilot: maandplannen, platform-specifieke content, goedkeuren en server-side publiceren — met meetbare resultaten.

Live merk: [top-noise.com](https://top-noise.com/).

## Vereisten

- Node.js 20+
- Een [Supabase](https://supabase.com)-project
- API-keys voor AI (OpenAI-compatible) en later LinkedIn / Meta / WordPress

## Setup

```sh
cp .env.example .env.local
npm install
```

Zet de waarden in `.env.local`. Voer daarna de migratie uit:

```sh
npx supabase db push
```

of plak [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) in de SQL-editor van je project.

```sh
npm run dev
```

Geplande publicatie lokaal (naast `npm run dev`):

```sh
npm run worker
```

## GitHub + Sevalla

Zelfde aanpak als Wensonweb: **Application Hosting** met de `Dockerfile` in de repo. Gebruik geen Static Site Hosting en geen Nixpacks.

1. In Sevalla: **Settings → Build strategy → Dockerfile**.
2. Environment variables zetten. Vink **build én runtime** aan voor `NEXT_PUBLIC_*`.
3. Stel `PORT` niet handmatig in — Sevalla zet die zelf (meestal 8080).
4. `NODE_ENV=production` wél zelf toevoegen.
5. `APP_URL` = je Sevalla-URL (later het custom domain).
6. Elke push naar `main` bouwt opnieuw.

Als de proxy de app niet bereikt (`upstream connect error 111`): networking-poort laten matchen met `PORT`, en in de logs controleren of `node server.js` start.

Geplande posts op Sevalla: twee **Cron jobs** (niet `npm run worker`):

- `* * * * *` → `curl -sS -H "Authorization: Bearer $CRON_SECRET" "$APP_URL/api/cron/publish"`
- `15 3 * * *` → hetzelfde voor `/api/cron/analytics` (tijdzone Europe/Brussels)

## Versie

0.2.0

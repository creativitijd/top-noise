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

of plak [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) en daarna [`0002_brand_analysis.sql`](supabase/migrations/0002_brand_analysis.sql) in de SQL-editor.

## Supabase API-keys

Het oude menu **Project Settings → API** bestaat niet meer.

1. Open het project op [supabase.com/dashboard](https://supabase.com/dashboard).
2. Snelste weg: knop **Connect** bovenaan — daar staan Project URL en publieke key.
3. Of linksonder het **tandwiel (Project Settings)** → **API Keys**.

| Waar in Supabase | Env-variabele |
| --- | --- |
| Project URL (`https://….supabase.co`) — Connect of **Settings → Data API** | `NEXT_PUBLIC_SUPABASE_URL` |
| **API Keys → Legacy API Keys → `anon` `public`** (of Publishable key) | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| **API Keys → Legacy API Keys → `service_role`** (Reveal) | `SUPABASE_SERVICE_ROLE_KEY` |

Zonder aanhalingstekens kopiëren. De `service_role`-key is geheim: alleen op de server (Sevalla runtime), nooit in de frontend.

**Authentication → URL Configuration** (apart van de keys):

- Site URL: `https://top-noise-h9zve.sevalla.app`
- Redirect URLs: `https://top-noise-h9zve.sevalla.app/auth/callback` en `https://top-noise-h9zve.sevalla.app/api/oauth/callback`

Lokaal daarna:

```sh
npm run dev
```

## Merkanalyse

Bij een nieuw project kun je een website en/of styleguide (PDF/PNG/JPG) laten analyseren. Daarvoor is `AI_API_KEY` nodig, bij voorkeur met `AI_ANALYSIS_MODEL=gpt-4o`. De analyse vult toon, visuele regels, pijlers en een doelgroepbepaling (primair + secundair); jij keurt ze daarna goed.

Geplande publicatie lokaal (naast `npm run dev`):

```sh
npm run worker
```

## GitHub + Sevalla

Zelfde aanpak als Wensonweb: **Application Hosting** met de `Dockerfile` in de repo. Gebruik geen Static Site Hosting en geen Nixpacks.

1. In Sevalla: **Settings → Build strategy → Dockerfile**.
2. Environment variables: **Applications → Top Noise → Environment variables → Add**.
   Vink **build én runtime** aan voor `NEXT_PUBLIC_*`. Zonder rebuild blijft login
   “Supabase-omgeving is niet geconfigureerd” geven.

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...   # of sb_publishable_...
   SUPABASE_SERVICE_ROLE_KEY=eyJ...       # alleen runtime
   APP_URL=https://top-noise-h9zve.sevalla.app
   APP_SECRET=                           # lange random string
   CRON_SECRET=                          # lange random string
   NODE_ENV=production
   AI_API_KEY=sk-...
   AI_MODEL=gpt-4o-mini
   AI_ANALYSIS_MODEL=gpt-4o
   ```

   Daarna **Deployments → Deploy now**.
3. Stel `PORT` niet handmatig in — Sevalla zet die zelf (meestal 8080).
4. Elke push naar `main` bouwt opnieuw.

Als de proxy de app niet bereikt (`upstream connect error 111`): networking-poort laten matchen met `PORT`, en in de logs controleren of `node server.js` start.

Geplande posts op Sevalla: twee **Cron jobs** (niet `npm run worker`):

- `* * * * *` → `curl -sS -H "Authorization: Bearer $CRON_SECRET" "$APP_URL/api/cron/publish"`
- `15 3 * * *` → hetzelfde voor `/api/cron/analytics` (tijdzone Europe/Brussels)

## Versie

0.8.1

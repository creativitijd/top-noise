# Promo

Commandocentrum voor merken: AI-content, kalender met goedkeuring, server-side publicatie en meetbare resultaten.

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

## Versie

0.1.0

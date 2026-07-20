## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Database

### Schema & Seeding

Schema SQL: `db/schema/*.sql` — archivos modulares (uno por módulo de negocio), con prefijo numérico para orden de creación. Cada archivo usa `CREATE TABLE IF NOT EXISTS` e `CREATE INDEX IF NOT EXISTS` para ser idempotente.

- Seed: `pnpm db:seed` (carga `.env` + `.env.development`)
- Seed producción: `pnpm db:seed:prod` (carga `.env` + `.env.production`)
- El script usa `@libsql/client` (Node version) para ejecución directa.

### Repository layer

Each module in `src/lib/modules/*/repository.ts` uses `getDb()` from `src/lib/db/client.ts` which returns a raw `@libsql/client/web` instance. All queries use `db.execute({ sql, args })` with `?` bind parameters to prevent SQL injection.

Common helpers:
- `nextSeq("table_name")` — gets `COALESCE(MAX(seq), 0) + 1` for a table via raw SQL
- `getDb()` — creates/returns a singleton `@libsql/client/web` client

## Deployment

El adaptador se configura en `astro.config.mjs` - solo cambiar la línea `adapter:` y su import:

```js
// Cloudflare
import cloudflare from '@astrojs/cloudflare';
adapter: cloudflare({ platformProxy: { enabled: true } }),

// Vercel
// import vercel from '@astrojs/vercel/serverless';
// adapter: vercel(),

// Netlify
// import netlify from '@astrojs/netlify';
// adapter: netlify(),
```

El cliente de BD (`@libsql/client/web`) funciona en Node 18+, Cloudflare Workers, Vercel Edge/Serverless y Netlify Edge/Functions sin cambios.

### Cloudflare Pages

1. `pnpm build` → genera `dist/`
2. Subir a Cloudflare Pages: seleccionar `dist/` como directorio de salida
3. Variables de entorno en el dashboard: `TURSO_DB_URL`, `TURSO_DB_TOKEN`, `PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`

### Vercel / Netlify

Solo cambiar el adapter en la config y hacer deploy desde el dashboard o CLI.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)

# Spark Eletrônica — Product Image Manager

Web module for uploading, managing, and distributing product images to marketplace integrators. Built on top of Spark's existing Supabase e-commerce backend.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 3 (dark mode) |
| Backend | Supabase (Auth + Postgres + Storage) |
| Deploy | Hostinger Node.js via GitHub |
| Node.js | ≥ 22.0.0 |

---

## Getting Started

### Prerequisites

- Node.js ≥ 22
- A Supabase project with the `ext_product_images` / `ext_api_keys` tables and the `product-assets` bucket provisioned (see [Database](#database))

### Install & run

```bash
npm install
npm run dev
```

### Environment variables

Create `.env.local` at the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project-id>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

> `SUPABASE_SERVICE_ROLE_KEY` is only used server-side (admin client in Server Actions and API key validation). Never expose it in client code.

---

## Routes

| Route | Auth | Description |
|---|---|---|
| `/` | Public | Public gallery, paginated (24/page), server-side search via `?q=&page=` |
| `/login` | Public | Supabase Auth sign-in |
| `/dashboard` | Protected | Stats overview (per type) and recent uploads |
| `/upload` | Protected | Multi-file drag-and-drop upload with preview and product-name feedback |
| `/gallery` | Protected | Product search, pagination, "no images" filter |
| `/gallery/[productCode]` | Protected | Per-product detail: drag-and-drop reorder, copy link, download, inline video preview |
| `/profile` | Protected | Password change and API key management |
| `/admin` | Protected (admin) | User creation |
| `/docs` | Protected | API documentation and live tester |
| `/api/health` | **Public** | Health check — returns `{ status: "ok", ts }` |
| `/api/products/[productCode]/images` | **Public** | JSON endpoint for integrators (rate limit: 60 req/min per IP) |
| `/api/products/[productCode]/zip` | **Public** | ZIP download of all product images (rate limit: 5 req/min per IP) |

---

## Public API

```
GET https://repositorio.spark.ind.br/api/products/{productCode}/images
GET https://repositorio.spark.ind.br/api/products/{productCode}/zip
GET https://repositorio.spark.ind.br/api/health
```

No authentication required, CORS open. Optional `X-API-Key` header is validated and updates `last_used_at` (`/images` only). Optional `?quality=high|low` filters by resolution type (manuals always included; promos and videos excluded when quality is set).

**`/images` response** (cache: `s-maxage=60, stale-while-revalidate=300`)

```json
{
  "product_code": "1234",
  "quality": "all",
  "total": 3,
  "images": [
    {
      "id": "uuid",
      "resolution_type": "high",
      "position": 0,
      "public_url": "https://…supabase.co/storage/v1/object/public/product-assets/…"
    }
  ],
  "manuals": [],
  "promos": [],
  "videos": []
}
```

**`/zip` response**: `spark_{code}_imagens.zip` with folders `alta_resolucao/`, `baixa_resolucao/`, `manuais/`, `material_promocional/`, `videos/`. Generated on demand (no cache), limits: 200 files / 200 MB.

---

## Database

Only `ext_product_images` and `ext_api_keys` belong to this module. All other Supabase tables are read-only from this application.

### `ext_product_images`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `product_code` | text NOT NULL | References `produto.codprod` as text |
| `file_path` | text NOT NULL | Path in `product-assets` bucket |
| `resolution_type` | text | `'high'`, `'low'`, `'manual'`, `'promo'` or `'video'` |
| `position` | int | Default 0 |
| `is_featured` | boolean | Marks the product cover image |
| `public_url` | text | Canonical URL for integrators |
| `thumb_url` | text | Public URL of the ~400px jpeg thumbnail generated client-side on upload; NULL for manual/promo/video (UI falls back to `public_url`) |
| `created_at` | timestamptz | Default now() |
| `updated_at` | timestamptz | Default now() — maintained by the `trg_ext_product_images_updated_at` BEFORE UPDATE trigger (`ext_set_updated_at()`) |
| `deleted_at` | timestamptz | Soft delete (NULL = active) |

RLS: public SELECT; INSERT/UPDATE/DELETE restricted to admins (`check_is_admin()`).

### `ext_api_keys`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `user_id` | uuid NOT NULL | FK → auth.users |
| `api_key` | text NOT NULL UNIQUE | `spark_`-prefixed key |
| `created_at` | timestamptz | Default now() |
| `last_used_at` | timestamptz | Updated on each API use |

RLS: SELECT/INSERT/DELETE scoped to `auth.uid() = user_id`.

### `ext_product_images_summary` (materialized view)

Per-product aggregation (`total_images`, per-type counts, `last_upload`, `thumb_url`, `product_name`). Refreshed every minute by the `refresh-product-images-summary` pg_cron job.

### Storage

- **Bucket**: `product-assets`
- Public read; authenticated write (RLS enforced)
- `{code}/thumbs/` prefix — client-generated ~400px jpeg thumbnails
- `trash/` prefix — soft-deleted files are **moved** here (`path` → `trash/{path}`, thumbnail included), never physically removed; permanent cleanup is a future job
- **Supabase Image Transformations are disabled on this project** — never use `transform` in `getPublicUrl`/`createSignedUrl` or `/render/image/` URLs; resizing happens client-side on canvas before upload

### File naming convention

```
{product_code}/{product_code}_{type}_{timestamp}_{position}.{ext}

# Example
1234/1234_high_1715000000_0.jpg
```

---

## Project Structure

```
src/
├── app/
│   ├── (protected)/          # Auth-guarded route group
│   │   ├── dashboard/
│   │   ├── upload/
│   │   ├── gallery/
│   │   │   └── [productCode]/
│   │   ├── profile/
│   │   ├── docs/
│   │   └── admin/
│   ├── actions/              # Server Actions (auth, upload, images, profile, admin)
│   ├── api/
│   │   ├── health/
│   │   └── products/[productCode]/{images,zip}/
│   ├── login/
│   └── page.tsx              # Public gallery
├── proxy.ts                  # Next 16 middleware (renamed from middleware.ts) — auth redirects
├── components/               # Shared UI components (ErrorBoundary, CopyButton, …)
├── lib/
│   ├── auth.ts               # requireAdmin() guard for write Server Actions
│   ├── naming.ts             # File + thumbnail naming logic
│   ├── sanitize.ts           # sanitizeSearch() for PostgREST .or() interpolation
│   ├── ratelimit.ts          # In-memory rate limiter (single-instance deploy)
│   └── supabase/             # Supabase clients (browser, server, admin)
└── types/
    └── database.ts           # Generated via Supabase MCP (generate_typescript_types)

scripts/                      # Standalone maintenance scripts (node scripts/*.mjs, service-role key)
```

---

## Scripts

```bash
npm run dev      # Start development server
npm run build    # Production build
npm run start    # Start production server
npm run lint     # eslint src
```

There is no test suite.

### Maintenance scripts (`scripts/`)

Run manually with `node scripts/<file>.mjs`. Each parses `.env.local` itself and uses the **service-role key** (bypasses RLS); none run at application runtime. Image-processing ones need `sharp` (devDependency).

| Script | Purpose |
|---|---|
| `backfill-thumbs.mjs` | Generate missing ~400px thumbnails and populate `thumb_url` (idempotent) |
| `rename-sku.mjs` | SKU migration: move bucket files + thumbs and rewrite `product_code` / `file_path` / `public_url` / `thumb_url` (code pairs hard-coded) |
| `upload-from-onedrive.mjs` | Scan a local folder (`FOTOS_ROOT`), classify `high`/`low` by size, flatten background, upload products with no existing files. `--confirm` to write (default dry-run), `--root <dir>`, `-h` |
| `fix-transparent-bg.mjs` | Reprocess active images, flattening alpha/black background to white JPEG, rewrite storage + `file_path` / `public_url` |
| `delete-low-res-storage.mjs` | One-shot (Mar 2026): remove 114 orphaned `low` files from storage (hard-coded path list) |

---

## Development Rules

- **Never** run `ALTER TABLE` or `UPDATE` on any table other than `ext_product_images` and `ext_api_keys`.
- Soft delete only: set `deleted_at = now()`, never physically DELETE from `ext_product_images`.
- `public_url` is the official image reference for marketplace integrators — always keep it populated.
- High/low images are resized/compressed on the client via canvas; manual, promo and video files upload as-is.
- **Never** use Supabase Image Transformations (`transform` / `/render/image/` URLs) — the feature is disabled on the project.
- Multi-file upload payloads are capped at `serverActions.bodySizeLimit: "50mb"` (`next.config.ts`).
- Regenerate `src/types/database.ts` (Supabase MCP `generate_typescript_types`) whenever the schema changes.
- The in-memory rate limiter assumes a single-instance deploy; switch to `@upstash/ratelimit` + Redis for multi-instance.

See `CLAUDE.md` for the full, authoritative project reference (in Portuguese).

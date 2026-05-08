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
- A Supabase project with the `ext_product_images` table and `product-assets` bucket provisioned (see [Database](#database))

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

> `SUPABASE_SERVICE_ROLE_KEY` is only used server-side (admin operations). Never expose it in client code.

---

## Routes

| Route | Auth | Description |
|---|---|---|
| `/login` | Public | Supabase Auth sign-in |
| `/dashboard` | Protected | Stats overview and recent uploads |
| `/upload` | Protected | Multi-file drag-and-drop upload |
| `/gallery` | Protected | Product search and image grid |
| `/gallery/[productCode]` | Protected | Per-product detail, copy link, download |
| `/docs` | Protected | API documentation and live tester |
| `/admin` | Protected | User management |
| `/api/products/[productCode]/images` | **Public** | JSON endpoint for integrators |

---

## Public API

```
GET https://repositorio.spark.ind.br/api/products/{productCode}/images
```

No authentication required. CORS open. Cache: 60 s / stale 5 min.

**Response**

```json
{
  "product_code": "1234",
  "total": 3,
  "images": [
    {
      "id": "uuid",
      "resolution_type": "high",
      "position": 0,
      "public_url": "https://…supabase.co/storage/v1/object/public/product-assets/…"
    }
  ]
}
```

---

## Database

Only the `ext_product_images` table belongs to this module. All other Supabase tables are read-only from this application.

### `ext_product_images`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `product_code` | text NOT NULL | References `produto.codprod` as text |
| `file_path` | text NOT NULL | Path in `product-assets` bucket |
| `resolution_type` | text | `'high'` or `'low'` |
| `position` | int | Default 0 |
| `public_url` | text | Canonical URL for integrators |
| `created_at` | timestamptz | Default now() |

### Storage

- **Bucket**: `product-assets`
- Public read; authenticated write (RLS enforced)

### File naming convention

```
{product_code}_{resolution}_{timestamp}_{position}.{ext}

# Example
1234_high_1715000000_0.jpg
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
│   │   ├── docs/
│   │   └── admin/
│   ├── actions/              # Server Actions (auth, upload, admin)
│   ├── api/products/[productCode]/images/
│   └── login/
├── components/               # Shared UI components
└── lib/
    ├── naming.ts             # File naming logic
    └── supabase/             # Supabase clients (browser, server, admin)
```

---

## Scripts

```bash
npm run dev      # Start development server
npm run build    # Production build
npm run start    # Start production server
npm run lint     # ESLint
```

---

## Development Rules

- **Never** run `ALTER TABLE` or `UPDATE` on any table other than `ext_product_images`.
- `public_url` is the official image reference for marketplace integrators — always keep it populated.
- High-res images are stored as uploaded; low-res can be pre-processed on the client before upload.
- Server Actions body size limit is 50 MB (configured in `next.config.ts`).

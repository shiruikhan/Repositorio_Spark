# Spark Eletrônica — Módulo de Gestão de Imagens de Produtos

## Contexto do Projeto
Sistema web para upload, gerenciamento e distribuição de imagens de produtos para integradores de marketplaces. Conecta-se ao Supabase existente do e-commerce da Spark Eletrônica.

## Supabase
- **Projeto**: `e-commerce`
- **Project ID**: `obbymrwivuhjopwnmoxx`
- **Região**: `sa-east-1`
- **Regra crítica**: nunca executar `ALTER TABLE` ou `UPDATE` em tabelas que não sejam `ext_product_images` e `ext_api_keys`.

## Tabelas existentes (não modificar)
| Tabela | Descrição |
|--------|-----------|
| `produto` | Catálogo de produtos (codprod bigint PK) |
| `categoria` | Árvore de categorias |
| `estoque` | Posições de estoque |
| `preco` | Tabela de preços (múltiplas tabelas de preço por codprod) |
| `especificacao` | Especificações técnicas |
| `produto_imagem` | URLs de imagem legado (campo `url` text, sincronizado via cron) — todos os registros (373 em jun/2026) estão espelhados em `ext_product_images` |
| `carrinho` | Carrinho de compras com RLS |
| `pedido` / `pedido_item` | Pedidos e itens |
| `cliente` | Usuários autenticados (vinculados ao `auth.users`, campo `is_admin` boolean) |
| `embalagem` / `pedido_embalagem` | Lógica de embalagem |
| `cidade` / `bairro` | Tabelas de endereçamento (IBGE) |
| `endereco` | Endereços dos clientes (FK → `cliente`, `cidade`) |
| `parceiro` | Parceiros/clientes do ERP Sankhya |
| `log_sincronizacao` | Log de sincronizações com o ERP |
| `log_integracao_pedido` | Log de integração de pedidos com o ERP |

## Tabelas do módulo (podem ser modificadas)
### `ext_product_images`
- `id` uuid PK DEFAULT gen_random_uuid()
- `product_code` text NOT NULL — código do produto (referência ao `produto.codprod` como texto)
- `file_path` text NOT NULL — caminho no bucket `product-assets`
- `resolution_type` text CHECK IN ('high', 'low', 'manual', 'promo', 'video')
- `position` int DEFAULT 0
- `is_featured` boolean DEFAULT false — marca a imagem de capa do produto
- `public_url` text — URL pública persistente para o integrador
- `thumb_url` text — URL pública da miniatura (~400px, jpeg) gerada no canvas do cliente no upload (migração `add_thumb_url_ext_product_images`, jun/2026); NULL para manual/promo/video — UI usa `public_url` como fallback
- `created_at` timestamptz DEFAULT now()
- `updated_at` timestamptz DEFAULT now() — atualizado automaticamente por trigger `trg_ext_product_images_updated_at` (BEFORE UPDATE, função `ext_set_updated_at()`, migração `add_updated_at_trigger_ext_product_images`)
- `deleted_at` timestamptz — soft delete (NULL = ativo)

### `ext_api_keys`
- `id` uuid PK DEFAULT gen_random_uuid()
- `user_id` uuid NOT NULL FK → auth.users
- `api_key` text NOT NULL UNIQUE — chave gerada com prefixo `spark_` (base32, 32 bytes)
- `created_at` timestamptz DEFAULT now()
- `last_used_at` timestamptz — atualizado a cada uso via API

### Materialized view `ext_product_images_summary`
Agrega por `product_code`: `total_images`, `high_count`, `low_count`, `manual_count`, `promo_count`, `video_count`, `last_upload`, `thumb_url` (fallback featured→low→high, preferindo `COALESCE(thumb_url, public_url)` de cada imagem), `product_name` (JOIN em `produto`). É uma **materialized view** atualizada a cada minuto pelo cron `refresh-product-images-summary` (`REFRESH MATERIALIZED VIEW CONCURRENTLY`) — dados podem estar até ~1 min defasados.

## Storage
- **Bucket**: `product-assets`
- Leitura pública; escrita restrita a usuários autenticados (RLS)
- Prefixo `{code}/thumbs/` — miniaturas (~400px jpeg) geradas no cliente; backfill das imagens antigas via `scripts/backfill-thumbs.mjs` (idempotente)
- Prefixo `trash/` — destino dos arquivos de registros soft-deletados (exclusão move `path` → `trash/{path}`, incluindo a thumb); restauração futura possível, limpeza definitiva por rotina a definir
- **Image Transformations: DESATIVADO no projeto (jun/2026)** — nunca usar `getPublicUrl`/`createSignedUrl` com `transform`, nem URLs `/storage/v1/render/image/...`. O recurso estourou a cota do plano (177/100) sem uso pelo app e foi desligado; redimensionamento é feito no canvas do cliente antes do upload e o `next/image` usa o otimizador do próprio Next.js no servidor

## Variáveis de ambiente
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=          # usado apenas em Server Actions (admin client) e validação de API Key em /api/products/.../images
NEXT_PUBLIC_SENTRY_DSN=             # DSN do projeto Sentry — se ausente, o SDK é desabilitado silenciosamente
```
Variáveis opcionais usadas **apenas por scripts** (`scripts/`), nunca pela aplicação:
```
FOTOS_ROOT= / ONEDRIVE_FOTOS_ROOT=  # pasta raiz varrida por scripts/upload-from-onedrive.mjs (default: OneDrive local)
```

## Proteção de rotas (`src/proxy.ts`)
- O middleware do Next 16 chama-se `proxy` (arquivo `src/proxy.ts`, não `middleware.ts`).
- `/` é liberada sem round-trip ao Supabase (minimiza TTFB); `/login` e demais rotas passam por `supabase.auth.getUser()`.
- Sem sessão → redireciona para `/login`; com sessão em `/login` → redireciona para `/dashboard`.
- Supabase inacessível/mal configurado é tratado como não autenticado (try/catch silencioso).
- `matcher` exclui `_next/static`, `_next/image`, `favicon.ico`, `api/` e arquivos de imagem — a proteção de `/admin` por `is_admin` é feita nas Server Actions (`requireAdmin()`), não aqui.

## Config Next.js (`next.config.ts`)
- `experimental.serverActions.bodySizeLimit: "50mb"` — teto do payload de upload múltiplo via Server Action.
- `images.remotePatterns` libera `obbymrwivuhjopwnmoxx.supabase.co/storage/v1/object/public/**` para o otimizador do `next/image`.
- `headers()` aplica `no-store` a tudo exceto `_next/static`/`_next/image`/`favicon`.
- `withSentryConfig` com `sourcemaps.disable: true` e `telemetry: false`.

## Rotas da aplicação
| Rota | Tipo | Descrição |
|------|------|-----------|
| `/login` | público | Autenticação Supabase Auth |
| `/` | público | Galeria pública paginada (24/página, busca server-side via `?q=&page=`) |
| `/dashboard` | protegido | Visão geral com stats e últimos uploads |
| `/upload` | protegido | Upload múltiplo com drag-drop, preview e feedback do nome do produto |
| `/gallery` | protegido | Busca e grid de produtos com paginação (24/página) e filtro "sem imagens" via SQL |
| `/gallery/[productCode]` | protegido | Detalhe com drag-and-drop de reordenação, copy link, download, preview de vídeo inline |
| `/profile` | protegido | Troca de senha e gestão de API Key |
| `/admin` | protegido (is_admin) | Criação de usuários |
| `/docs` | protegido | Documentação e tester da API (inclui endpoint `/zip`) |
| `/api/health` | **público** | Health check — retorna `{ status: "ok", ts }` |
| `/api/products/[productCode]/images` | **público** | JSON endpoint para o integrador (rate limit: 60 req/min por IP) |
| `/api/products/[productCode]/zip` | **público** | Download ZIP de todas as imagens do produto (rate limit: 5 req/min por IP, batches de 5, máx 200 arquivos / 200 MB) |

## Tipos TypeScript
- **`src/types/database.ts`** — schema completo gerado via Supabase MCP (`generate_typescript_types`)
- Contém tipos para todas as tabelas, views e functions do banco
- Regenerar sempre que houver mudança de schema: usar o MCP `generate_typescript_types` com `project_id: obbymrwivuhjopwnmoxx`

## Fases do Plano
- [x] **Fase 1**: Infraestrutura Supabase (tabela + RLS + bucket)
- [x] **Fase 2**: Autenticação e layout base
- [x] **Fase 3**: Upload múltiplo com padronização de nomenclatura
- [x] **Fase 4**: Galeria e visualização
- [x] **Fase 5**: Endpoint/documentação para integrador
- [x] **Fase 6**: Otimizações, hardening e qualidade (ver histórico abaixo)

## Histórico de melhorias (Fase 6)
| Item | Descrição | Arquivo(s) |
|------|-----------|-----------|
| Cache config | `no-store` restrito a rotas dinâmicas; assets estáticos (`_next/static`) cacheados | `next.config.ts` |
| Batch reorder | `reorderImages` dispara os `UPDATE` de posição em paralelo via `Promise.all`, cada um com filtro `deleted_at IS NULL` (a abordagem `upsert` em lote foi revertida em 30/jun/2026, commit `7df655d`) | `actions/images.ts` |
| Health check | Endpoint `/api/health` para monitoramento externo | `api/health/route.ts` |
| Modal exclusão | `window.confirm` substituído por modal customizado em `ImageGrid` | `gallery/[productCode]/ImageGrid.tsx` |
| CopyButton | Remoção da implementação local duplicada em `UploadForm.tsx` | `upload/UploadForm.tsx` |
| Docs ZIP | Seção de Download ZIP documentada, `promos[]`/`videos[]` adicionados ao schema | `docs/page.tsx` |
| Prebuild | Script `prebuild` removido — Next.js gerencia `.next` atomicamente | `package.json` |
| Preview vídeo | `<video controls>` inline na galeria de produto em vez de ícone + download | `gallery/[productCode]/page.tsx` |
| Feedback produto | `onBlur` no campo de código do upload busca e exibe o `descrprod` | `upload/UploadForm.tsx` |
| Filtro SQL | "Sem imagens" usa `NOT IN` no banco em vez de subtração em memória JS | `gallery/page.tsx` |
| ErrorBoundary | Componente `ErrorBoundary` envolve `{children}` no layout protegido | `components/ErrorBoundary.tsx`, `(protected)/layout.tsx` |
| Hardening API | `/images` usa anon key para produtos; service role apenas para `ext_api_keys` | `api/products/.../images/route.ts` |
| ZIP concorrência | Downloads do ZIP em batches de 5 em vez de `Promise.all` com N simultâneos | `api/products/.../zip/route.ts` |
| Tipos TS | `src/types/database.ts` gerado via Supabase MCP com schema completo | `types/database.ts` |
| Paginação pública | Galeria `/` paginada server-side (24/pág); busca via URL (`?q=&page=`) com debounce | `app/page.tsx`, `app/PublicGallery.tsx` |
| Rate limiting | Limiter em memória: `/images` 60 req/min, `/zip` 5 req/min por IP; `Retry-After: 60` | `lib/ratelimit.ts`, rotas de API |
| Sentry | Rastreamento de erros em produção; ativado via `NEXT_PUBLIC_SENTRY_DSN` | `sentry.*.config.ts`, `instrumentation.ts`, `next.config.ts` |

## Histórico de melhorias (plano de ação — jun/2026)
| Item | Descrição | Arquivo(s) |
|------|-----------|-----------|
| Busca sanitizada | `sanitizeSearch()` remove `,()` antes de interpolar em `.or(...)` do PostgREST | `lib/sanitize.ts`, `app/page.tsx`, `gallery/page.tsx` |
| Menu mobile | Hambúrguer + drawer abaixo de `sm` (antes não havia navegação em mobile) | `components/MobileMenu.tsx`, `Header.tsx` |
| requireAdmin | Server Actions de escrita checam `is_admin` e retornam mensagem explícita | `lib/auth.ts`, `actions/images.ts`, `actions/upload.ts` |
| Lixeira (D1-A) | Exclusão move arquivo (e thumb) para `trash/{path}` em vez de remover | `actions/images.ts` (`moveFilesToTrash`) |
| Thumbnails (D2-A) | Coluna `thumb_url`; thumb ~400px gerada no canvas no upload; MV prefere thumb; backfill de 532 imagens concluído | `uploadUtils.ts`, `useUploadForm.ts`, `lib/naming.ts`, `scripts/backfill-thumbs.mjs`, migração `add_thumb_url_ext_product_images` |
| Preview leak | Object URLs revogadas ao trocar/remover arquivos e no unmount | `upload/useUploadForm.ts` |
| Header `<Link>` | Âncoras internas trocadas por `next/link`; headers HTTP legados (`Pragma`, `Expires`, `Surrogate-Control`) removidos | `Header.tsx`, `next.config.ts` |
| A11y | `aria-label`/`aria-pressed` em botões só-ícone; alt text descritivo nos cards | `ImageGrid.tsx`, `GalleryGrid.tsx`, `dashboard/page.tsx` |
| ESLint 9 | `next lint` (removido no Next 16) substituído por flat config nativa + `eslint src` | `eslint.config.mjs`, `package.json` |

## API para o integrador
```
GET https://repositorio.spark.ind.br/api/products/{productCode}/images
GET https://repositorio.spark.ind.br/api/products/{productCode}/zip
GET https://repositorio.spark.ind.br/api/health
```
- Sem autenticação obrigatória, CORS aberto
- Header opcional `X-API-Key: <chave>` — valida e registra `last_used_at` (apenas `/images`)
- Parâmetro opcional `?quality=high|low` filtra tipo de imagem (manuals incluídos sempre; promos e videos excluídos quando quality é especificado)
- Resposta `/images`: `{ product_code, quality, total, images[], manuals[], promos[], videos[] }`
- Resposta `/zip`: arquivo `spark_{code}_imagens.zip` com pastas `alta_resolucao/`, `baixa_resolucao/`, `manuais/`, `material_promocional/`, `videos/`
- Cache `/images`: `public, s-maxage=60, stale-while-revalidate=300`
- `/zip`: sem cache, gerado sob demanda, limite 200 arquivos / 200 MB
- Alternativa: Supabase REST direto com `apikey` header

## Nomenclatura de arquivos no bucket
```
{codigo_produto}/{codigo_produto}_{tipo}_{timestamp}_{posicao}.ext
Exemplo: 1234/1234_high_1715000000_0.jpg
Thumbnail: 1234/thumbs/1234_high_1715000000_0_thumb.jpg (derivada via buildThumbPath em src/lib/naming.ts)
```

## Scripts de manutenção (`scripts/`)
Rodados manualmente com `node scripts/<arquivo>.mjs`. Cada um parseia `.env.local` na mão e usa a **service role key** (ignora RLS). Nenhum é referenciado pela aplicação em runtime. Os que processam imagem dependem de `sharp` (devDependency).

| Script | O que faz | Idempotente? |
|--------|-----------|--------------|
| `backfill-thumbs.mjs` | Gera a thumb `~400px` (`thumbs/…_thumb.jpg`) e preenche `thumb_url` das imagens high/low sem miniatura | Sim |
| `rename-sku.mjs` | Troca de SKU (ago/2026): move arquivos + thumbs no bucket e atualiza `product_code`/`file_path`/`public_url`/`thumb_url`. Pares de código são hard-coded no arquivo | Não (após sucesso parcial de um registro) |
| `upload-from-onedrive.mjs` | Varre pasta local (`FOTOS_ROOT`), classifica `high`/`low` por tamanho (≥ 1 MB), achata fundo p/ branco e sobe produtos que ainda não têm arquivo no storage. `--confirm` para subir de verdade (default: dry-run), `--root <pasta>`, `-h` | Sim (pula produto com qualquer arquivo no storage) |
| `fix-transparent-bg.mjs` | Reprocessa imagens ativas achatando alfa/fundo preto para branco (JPEG), regrava no storage e atualiza `file_path`/`public_url`. JPEG já com fundo preto composited não é recuperável | Sim (pula JPEG já processado) |
| `delete-low-res-storage.mjs` | Remove do storage 114 arquivos `low` já apagados do banco — lista de paths hard-coded, uso único (mar/2026) | — (one-shot) |

## RLS — ext_product_images
- SELECT: público (leitura sem autenticação)
- INSERT / UPDATE / DELETE: somente `check_is_admin()` retorna true (SECURITY DEFINER) — migração `fix_ext_product_images_rls_admin_only` (mai/2026); na prática só admins conseguem fazer upload

## RLS — ext_api_keys
- SELECT / DELETE: `auth.uid() = user_id`
- INSERT: WITH CHECK `auth.uid() = user_id` (migração `fix_ext_api_keys_insert_rls_with_check`)

## Regras de desenvolvimento
- Nunca alterar tabelas existentes (apenas `ext_product_images` e `ext_api_keys` são permitidas)
- Soft delete: usar `deleted_at = now()`, nunca DELETE físico em `ext_product_images`; o arquivo do Storage é **movido para `trash/{path}`** (nunca removido) — ver `moveFilesToTrash` em `actions/images.ts`
- Server Actions de escrita devem chamar `requireAdmin()` (`src/lib/auth.ts`) no início — sem isso o RLS bloqueia não-admins silenciosamente (UPDATE sem match não retorna erro)
- Termos de busca interpolados em `.or(...)` devem passar por `sanitizeSearch()` (`src/lib/sanitize.ts`) — vírgulas/parênteses quebram o parser do PostgREST
- Upload de high/low gera e sobe também a miniatura (`generateThumb` + `buildThumbPath`); falha na thumb não bloqueia o upload (fallback no `public_url`)
- `public_url` é a referência oficial para o integrador de marketplaces
- Imagens high/low passam pelo canvas no cliente (resize/compress); manual, promo e video sobem direto
- **Nunca usar Supabase Image Transformations** (`transform` em `getPublicUrl`/`createSignedUrl` ou URLs `/render/image/`) — recurso desativado no projeto (jun/2026) após estourar a cota; usar sempre `public_url` original e redimensionar no cliente
- Validação de código de produto: inteiro positivo (não exige presença em `produto.codprod`)
- Server Actions de escrita usam `createClient()` (RLS do usuário); deleções de Storage usam `createAdminClient()` (service role)
- `/api/products/.../images`: usa anon key para queries de produto; service role apenas para validação/atualização de `ext_api_keys`
- `next.config.ts` aplica `no-store` apenas em rotas dinâmicas (`/((?!_next/static|_next/image|favicon).*)`); assets estáticos são cacheados normalmente pelo browser
- Ao regenerar tipos: usar MCP `generate_typescript_types` e sobrescrever `src/types/database.ts`
- Rate limiting em memória (`src/lib/ratelimit.ts`) — adequado para deploy single-instance no Hostinger; se migrar para multi-instância, substituir por `@upstash/ratelimit` + Redis
- Sentry ativado somente quando `NEXT_PUBLIC_SENTRY_DSN` estiver definido — degradação graciosa em ambientes sem a variável

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
| `produto_imagem` | URLs de imagem legado (campo `url` text, sincronizado via cron) — todos os 336 registros já estão espelhados em `ext_product_images` |
| `carrinho` | Carrinho de compras com RLS |
| `pedido` / `pedido_item` | Pedidos e itens |
| `cliente` | Usuários autenticados (vinculados ao `auth.users`, campo `is_admin` boolean) |
| `embalagem` / `pedido_embalagem` | Lógica de embalagem |
| `cidade` / `bairro` | Tabelas de endereçamento (IBGE) |
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
- `created_at` timestamptz DEFAULT now()
- `deleted_at` timestamptz — soft delete (NULL = ativo)

### `ext_api_keys`
- `id` uuid PK DEFAULT gen_random_uuid()
- `user_id` uuid NOT NULL FK → auth.users
- `api_key` text NOT NULL UNIQUE — chave gerada com prefixo `spark_` (base32, 32 bytes)
- `created_at` timestamptz DEFAULT now()
- `last_used_at` timestamptz — atualizado a cada uso via API

### View `ext_product_images_summary`
Agrega por `product_code`: `total_images`, `high_count`, `low_count`, `manual_count`, `promo_count`, `video_count`, `last_upload`, `thumb_url` (fallback low→high), `product_name` (JOIN em `produto`).

## Storage
- **Bucket**: `product-assets`
- Leitura pública; escrita restrita a usuários autenticados (RLS)

## Variáveis de ambiente
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=          # usado apenas em Server Actions (admin client) e validação de API Key em /api/products/.../images
NEXT_PUBLIC_SENTRY_DSN=             # DSN do projeto Sentry — se ausente, o SDK é desabilitado silenciosamente
```

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
| Batch reorder | `reorderImages` usa `upsert` em lote (1 query) em vez de N round-trips | `actions/images.ts` |
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
```

## RLS — ext_product_images
- SELECT: público (leitura sem autenticação)
- INSERT: qualquer usuário autenticado
- UPDATE / DELETE: somente `check_is_admin()` retorna true (SECURITY DEFINER)

## RLS — ext_api_keys
- SELECT / DELETE: `auth.uid() = user_id`
- INSERT: usuário autenticado (user_id fixado no Server Action — sem WITH CHECK no banco)

## Regras de desenvolvimento
- Nunca alterar tabelas existentes (apenas `ext_product_images` e `ext_api_keys` são permitidas)
- Soft delete: usar `deleted_at = now()`, nunca DELETE físico em `ext_product_images`
- `public_url` é a referência oficial para o integrador de marketplaces
- Imagens high/low passam pelo canvas no cliente (resize/compress); manual, promo e video sobem direto
- Validação de código de produto: inteiro positivo (não exige presença em `produto.codprod`)
- Server Actions de escrita usam `createClient()` (RLS do usuário); deleções de Storage usam `createAdminClient()` (service role)
- `/api/products/.../images`: usa anon key para queries de produto; service role apenas para validação/atualização de `ext_api_keys`
- `next.config.ts` aplica `no-store` apenas em rotas dinâmicas (`/((?!_next/static|_next/image|favicon).*)`); assets estáticos são cacheados normalmente pelo browser
- Ao regenerar tipos: usar MCP `generate_typescript_types` e sobrescrever `src/types/database.ts`
- Rate limiting em memória (`src/lib/ratelimit.ts`) — adequado para deploy single-instance no Hostinger; se migrar para multi-instância, substituir por `@upstash/ratelimit` + Redis
- Sentry ativado somente quando `NEXT_PUBLIC_SENTRY_DSN` estiver definido — degradação graciosa em ambientes sem a variável

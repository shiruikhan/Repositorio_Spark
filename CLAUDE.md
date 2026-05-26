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
| `produto_imagem` | URLs de imagem legado (campo `url` text, sincronizado via cron) |
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
SUPABASE_SERVICE_ROLE_KEY=   # usado em Server Actions (admin client) e /api/products/.../images
```

## Rotas da aplicação
| Rota | Tipo | Descrição |
|------|------|-----------|
| `/login` | público | Autenticação Supabase Auth |
| `/dashboard` | protegido | Visão geral com stats e últimos uploads |
| `/upload` | protegido | Upload múltiplo com drag-drop e preview |
| `/gallery` | protegido | Busca e grid de produtos com paginação (24/página) |
| `/gallery/[productCode]` | protegido | Detalhe com drag-and-drop de reordenação, copy link, download |
| `/profile` | protegido | Troca de senha e gestão de API Key |
| `/admin` | protegido (is_admin) | Criação de usuários |
| `/docs` | protegido | Documentação e tester da API |
| `/api/products/[productCode]/images` | **público** | JSON endpoint para o integrador |
| `/api/products/[productCode]/zip` | **público** | Download ZIP de todas as imagens do produto |

## Fases do Plano
- [x] **Fase 1**: Infraestrutura Supabase (tabela + RLS + bucket)
- [x] **Fase 2**: Autenticação e layout base
- [x] **Fase 3**: Upload múltiplo com padronização de nomenclatura
- [x] **Fase 4**: Galeria e visualização
- [x] **Fase 5**: Endpoint/documentação para integrador

## API para o integrador
```
GET https://repositorio.spark.ind.br/api/products/{productCode}/images
GET https://repositorio.spark.ind.br/api/products/{productCode}/zip
```
- Sem autenticação obrigatória, CORS aberto
- Header opcional `X-API-Key: <chave>` — valida e registra `last_used_at`
- Parâmetro opcional `?quality=high|low` filtra tipo de imagem (manuals incluídos sempre)
- Resposta `/images`: `{ product_code, quality, total, images[], manuals[], promos[], videos[] }`
- Resposta `/zip`: arquivo `spark_{code}_imagens.zip` com pastas por tipo
- Cache `/images`: `public, s-maxage=60, stale-while-revalidate=300`
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
- `next.config.ts` força `no-store` em todas as rotas — isso prevalece para rotas protegidas mas o header `Cache-Control` do route handler `/api/.../images` sobrescreve para a resposta pública

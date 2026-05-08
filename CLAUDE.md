# Spark Eletrônica — Módulo de Gestão de Imagens de Produtos

## Contexto do Projeto
Sistema web para upload, gerenciamento e distribuição de imagens de produtos para integradores de marketplaces. Conecta-se ao Supabase existente do e-commerce da Spark Eletrônica.

## Supabase
- **Projeto**: `e-commerce`
- **Project ID**: `obbymrwivuhjopwnmoxx`
- **Região**: `sa-east-1`
- **Regra crítica**: nunca executar `ALTER TABLE` ou `UPDATE` em tabelas que não sejam `ext_product_images`.

## Tabelas existentes (não modificar)
| Tabela | Descrição |
|--------|-----------|
| `produto` | Catálogo de produtos (82 registros, codprod bigint PK) |
| `categoria` | Árvore de categorias (182 registros) |
| `estoque` | Posições de estoque (54 registros) |
| `preco` | Tabela de preços (82 registros) |
| `especificacao` | Especificações técnicas (101 registros) |
| `produto_imagem` | URLs de imagem legado (0 registros — campo `url` text) |
| `carrinho` | Carrinho de compras com RLS |
| `pedido` / `pedido_item` | Pedidos e itens |
| `cliente` | Usuários autenticados (vinculados ao `auth.users`) |
| `embalagem` / `pedido_embalagem` | Lógica de embalagem |

## Nova tabela (módulo de imagens)
### `ext_product_images`
- `id` uuid PK
- `product_code` text NOT NULL — código do produto (referência ao `produto.codprod` como texto)
- `file_path` text NOT NULL — caminho no bucket `product-assets`
- `resolution_type` text CHECK IN ('high', 'low')
- `position` int DEFAULT 0
- `public_url` text — URL pública persistente para o integrador
- `created_at` timestamptz DEFAULT now()

## Storage
- **Bucket**: `product-assets`
- Leitura pública; escrita restrita a usuários autenticados (RLS)

## Fases do Plano
- [x] **Fase 1**: Infraestrutura Supabase (tabela + RLS + bucket)
- [ ] **Fase 2**: Autenticação e layout base
- [ ] **Fase 3**: Upload múltiplo com padronização de nomenclatura
- [ ] **Fase 4**: Galeria e visualização
- [ ] **Fase 5**: Endpoint/documentação para integrador

## Nomenclatura de arquivos no bucket
```
{codigo_produto}_{tipo}_{timestamp}_{posicao}.ext
Exemplo: 1234_high_1715000000_0.jpg
```

## Regras de desenvolvimento
- Nunca alterar tabelas existentes (apenas `ext_product_images` é permitido)
- `public_url` é a referência oficial para o integrador de marketplaces
- Imagens high-res mantidas originais no upload; low-res podem ser pré-processadas no cliente

# Plano de Ação — Implementação das Melhorias

> Baseado em `melhorias_propostas.md` (levantamento de 11/06/2026).
> Organizado em 6 fases sequenciais. Cada fase termina com build verde, teste manual e deploy — entregas pequenas e frequentes em vez de um big-bang.
> Referências entre parênteses (ex.: *3.1*) apontam para o item correspondente em `melhorias_propostas.md`.

## Como usar este plano
- Cada tarefa tem: **arquivos envolvidos**, **o que fazer** e **critério de aceite**.
- Marcar `[x]` conforme concluir; uma fase só inicia com a anterior deployada e estável.
- Tarefas dentro de uma fase são independentes entre si (podem ser feitas em qualquer ordem), salvo indicação.

---

## Fase 0 — Decisões prévias (sem código)

Duas decisões de produto destravam fases posteriores. Decidir antes de começar:

- [x] **D1 — Modelo de exclusão** (*3.2*) — **decidido: Opção A** (jun/2026): hoje o banco faz soft delete mas o arquivo do Storage é apagado fisicamente — restauração impossível.
  - **Opção A (recomendada)**: ao excluir, mover o arquivo para o prefixo `trash/{path original}` no bucket e manter `deleted_at`. Habilita a feature de lixeira/restauração (Fase 5). Limpeza definitiva via job mensal.
  - **Opção B**: assumir exclusão física e parar de fingir soft delete (remover o conceito da documentação; `deleted_at` vira só registro histórico).
  - Impacta: Fase 2 (T2.4) e Fase 5.
- [x] **D2 — Thumbnails** (*2.5*) — **decidido: Opção A** (jun/2026): servir miniatura real nos cards em vez do arquivo original.
  - **Opção A (recomendada)**: gerar variante `thumb` (~400px) no canvas durante o upload — sem custo extra, usa o pipeline que já existe. Requer backfill das 373 imagens existentes via script.
  - **Opção B**: Supabase Image Transformations — **descartada** (recurso desativado no projeto por estouro de cota, ver CLAUDE.md).
  - Impacta: Fase 4 (T4.4).

---

## Fase 1 — Correções rápidas (1 sessão de trabalho)

Bugs e lacunas pequenas, todas independentes, risco baixo. Deploy único ao final.

- [x] **T1.1 — Sanitizar termo de busca** (*3.1*) 🔴
  - Arquivos: `src/app/page.tsx:50`, `src/app/(protected)/gallery/page.tsx:109`
  - Fazer: criar helper `sanitizeSearch(q)` em `src/lib/` removendo `,`, `(`, `)`, `%` duplicado; aplicar nos dois `.or(...)`.
  - Aceite: buscar `abc,def(` não retorna erro 400; busca normal continua funcionando.

- [x] **T1.2 — Menu mobile no Header** (*1.1*) 🔴
  - Arquivos: `src/components/Header.tsx` (+ novo `src/components/MobileMenu.tsx` client component)
  - Fazer: botão hambúrguer visível abaixo de `sm`, abrindo dropdown/drawer com os mesmos NavLinks + perfil + sair. Fechar ao navegar e com ESC.
  - Aceite: em viewport 375px todas as rotas são alcançáveis; em desktop nada muda.

- [x] **T1.3 — Checagem `is_admin` nas Server Actions** (*3.5*)
  - Arquivos: `src/app/actions/images.ts`, `upload.ts`
  - Fazer: helper `requireAdmin()` (consulta `cliente.is_admin`) chamado no início de cada action de escrita; retornar `{ ok: false, message: "Apenas administradores..." }`.
  - Aceite: usuário não-admin recebe mensagem clara em vez de sucesso silencioso (o RLS hoje faz o update "passar" com 0 linhas).

- [x] **T1.4 — Revogar Object URLs dos previews** (*2.7*)
  - Arquivos: `src/app/(protected)/upload/useUploadForm.ts:176-190`
  - Fazer: antes de recriar `previews`, revogar as URLs antigas; revogar tudo em cleanup de unmount (`useEffect`).
  - Aceite: DevTools → Memory não acumula blobs após adicionar/remover arquivos repetidamente.

- [x] **T1.5 — `<Link>` no Header + limpeza de headers HTTP** (*1.7*, *3.8*)
  - Arquivos: `src/components/Header.tsx:19,43`, `next.config.ts`
  - Fazer: trocar `<a>` internos por `next/link`; remover `Pragma`, `Expires` e `Surrogate-Control` (manter só `Cache-Control`).
  - Aceite: navegação pelo logo não recarrega a página; resposta HTTP sem headers legados.

- [x] **T1.6 — `aria-label` e alt text** (*1.9*, parcial)
  - Arquivos: `ThemeToggle.tsx`, `ImageGrid.tsx`, cards de galeria
  - Fazer: `aria-label` em botões só-ícone; alt das imagens com nome do produto quando disponível.
  - Aceite: extensão axe/Lighthouse sem violações críticas de nome acessível.

**Verificação da fase**: `npm run lint && npx tsc --noEmit && npm run build` + smoke manual (login, upload 2 imagens, galeria, busca com caracteres especiais, mobile 375px).

---

## Fase 2 — Fundação de qualidade (CI, testes, tipos)

Cria a rede de segurança antes das mudanças maiores. **T2.1 primeiro; demais em qualquer ordem.**

- [ ] **T2.1 — CI no GitHub Actions** (*4.1*)
  - Arquivos: novo `.github/workflows/ci.yml`
  - Fazer: workflow em push/PR para `main`: `npm ci` → `npm run lint` → `npx tsc --noEmit` → `npm run build` (com env vars dummy de Supabase via secrets/placeholders). Node 22.
  - Aceite: push quebrado falha o check no GitHub antes do deploy do Hostinger.

- [ ] **T2.2 — Vitest + primeiros testes unitários** (*4.1*)
  - Arquivos: `vitest.config.ts`, `src/lib/naming.test.ts`, `src/lib/ratelimit.test.ts`, `src/app/(protected)/upload/uploadUtils.test.ts`, novo script `"test"` no `package.json`, etapa no CI
  - Fazer: cobrir `buildFilePath`, `checkRateLimit` (janela, limite, expiração), `isVideoFile`/`isPdfFile`, e o novo `sanitizeSearch` da T1.1.
  - Aceite: `npm test` verde local e no CI; ≥ 15 asserções cobrindo casos de borda.

- [ ] **T2.3 — Tipar clients Supabase com `Database`** (*4.4*)
  - Arquivos: `src/lib/supabase/client.ts`, `server.ts`, `admin.ts`, e remoção dos casts em `gallery/page.tsx:131-141`
  - Fazer: `createClient<Database>(...)` nos três factories; deixar o compilador apontar os casts redundantes e removê-los.
  - Aceite: `tsc --noEmit` verde sem nenhum `as string`/`as number` nas queries da galeria.

- [ ] **T2.4 — Validação com zod nas Server Actions** (*3.4*)
  - Arquivos: `src/app/actions/*.ts`, novo `src/lib/validation.ts`; adicionar dependência `zod`
  - Fazer: schemas para os argumentos de cada action (productCode `/^\d+$/`, resolutionType enum, position int ≥ 0, arrays com tamanho máximo); retornar mensagem do zod em falha.
  - Aceite: chamar action com payload malformado retorna `{ ok: false }` descritivo; testes unitários dos schemas no Vitest.

- [x] **T2.5 — Implementar decisão D1 (modelo de exclusão)** (*3.2*) — *depende da Fase 0*
  - Arquivos: `src/app/actions/images.ts` (se Opção A: `storage.move` para `trash/` em vez de `remove`)
  - Aceite: excluir imagem → arquivo aparece em `trash/` no bucket; registro com `deleted_at` preenchido; galeria não exibe mais.

**Verificação da fase**: CI verde de ponta a ponta; exclusão e upload testados manualmente em produção.

---

## Fase 3 — Performance percebida

- [ ] **T3.1 — Skeletons (`loading.tsx`)** (*1.2*)
  - Arquivos: novos `src/app/loading.tsx`, `(protected)/dashboard/loading.tsx`, `(protected)/gallery/loading.tsx`, `(protected)/gallery/[productCode]/loading.tsx`
  - Fazer: skeletons com a mesma estrutura de grid de cada página (cards cinza pulsando, `animate-pulse`).
  - Aceite: navegar entre rotas mostra skeleton imediato em vez de tela congelada.

- [ ] **T3.2 — `error.tsx` por segmento** (*1.3*)
  - Arquivos: novos `src/app/error.tsx`, `(protected)/error.tsx`; avaliar remoção do `ErrorBoundary` custom
  - Aceite: erro forçado numa página mostra fallback com botão "Tentar novamente" funcional.

- [ ] **T3.3 — Uploads paralelos em batches** (*2.1*) 🔴
  - Arquivos: `src/app/(protected)/upload/useUploadForm.ts:226-267`
  - Fazer: substituir o `for` sequencial por processamento em batches de 3 (mesmo padrão do ZIP); manter `position` correto pré-calculando `startPosition + índice global`; progresso por arquivo já existe.
  - Aceite: 9 imagens sobem em ~1/3 do tempo atual; posições finais sequenciais e sem colisão; erros individuais continuam reportados por arquivo.

- [ ] **T3.4 — ISR na galeria pública** (*2.6*)
  - Arquivos: `src/app/page.tsx`, `next.config.ts`
  - Fazer: trocar `force-dynamic` por `export const revalidate = 60`; ajustar o matcher de headers para não aplicar `no-store` na rota `/` (senão o ISR é anulado no browser/CDN).
  - Aceite: TTFB da home cai (medir antes/depois); dado novo aparece em ≤ 2 min (MV 1 min + ISR 60 s).

- [ ] **T3.5 — Dashboard com query agregada** (*2.3*)
  - Arquivos: `src/app/(protected)/dashboard/page.tsx:16-34`
  - Fazer: substituir os 7 counts por uma única query de agregação na `ext_product_images_summary` (RPC `ext_dashboard_stats()` se o PostgREST não agregar direto). Manter a query de "últimos uploads".
  - Aceite: dashboard renderiza idêntico com 2 queries em vez de 8.

**Verificação da fase**: Lighthouse na home pública antes/depois (registrar números); upload de lote grande cronometrado.

---

## Fase 4 — Robustez de upload e dados

- [ ] **T4.1 — TUS (resumable upload) para vídeos** (*2.2*) 🔴
  - Arquivos: `useUploadForm.ts`, novo `src/lib/tusUpload.ts`; dependência `tus-js-client`
  - Fazer: rota de upload via TUS (`/storage/v1/upload/resumable`) para arquivos > 6 MB (vídeos e PDFs grandes); progresso real (remove o `@ts-expect-error`); retry automático; imagens pequenas continuam no upload simples.
  - Aceite: vídeo de ~100 MB sobe com barra de progresso real; derrubar a rede no meio e reconectar retoma de onde parou.

- [ ] **T4.2 — Constraint de posição + tratamento de colisão** (*3.3*)
  - Arquivos: migração Supabase (índice único parcial `(product_code, resolution_type, position) WHERE deleted_at IS NULL`), `actions/upload.ts` (retry com posição recalculada em conflito 23505)
  - ⚠️ Antes da migração: verificar duplicatas existentes e corrigi-las (`UPDATE` apenas em `ext_product_images` — permitido).
  - Aceite: dois uploads simultâneos para o mesmo produto não geram posições duplicadas.

- [ ] **T4.3 — RPC para filtro "sem imagens" com paginação** (*2.4*)
  - Arquivos: migração (function `ext_products_without_images(search text, lim int, off int)` com `LEFT JOIN`), `gallery/page.tsx:32-100`
  - Fazer: substituir o fluxo "carrega todos os códigos + NOT IN" pela RPC paginada; adicionar paginação na UI desse filtro (hoje renderiza tudo).
  - Aceite: filtro funciona com paginação; busca por código numérico funciona via SQL (sem filtro em memória).

- [x] **T4.4 — Thumbnails reais (decisão D2)** — concluído antecipadamente junto com a Fase 1 (backfill de 532 imagens em jun/2026) (*2.5*) — *depende da Fase 0*
  - Arquivos: `uploadUtils.ts` (gerar variante `thumb` 400px no canvas), `actions/upload.ts`, script de backfill em `scripts/`, ajuste do `thumb_url` na MV (migração)
  - Fazer: no upload de high/low, gerar e subir também `{code}_thumb_{ts}_{pos}.jpg`; backfill das imagens existentes; MV passa a preferir a variante thumb.
  - Aceite: cards da galeria carregam arquivos de ~30 KB em vez do original; transferência da página de galeria cai > 80%.

- [ ] **T4.5 — Validar ownership em `reorderImages`** (*3.6*)
  - Arquivos: `src/app/actions/images.ts:104-123`
  - Fazer: antes do upsert, conferir que todos os `id`s pertencem ao `productCode` informado (1 query `in('id', ids).eq('product_code', code)`).
  - Aceite: payload com id de outro produto é rejeitado com mensagem clara.

**Verificação da fase**: testes de upload concorrente (2 abas), vídeo grande com queda de rede, galeria "sem imagens" paginada.

---

## Fase 5 — UX e features de maior valor

Priorizar conforme retorno; não precisam ser todas.

- [ ] **T5.1 — Lightbox na galeria de produto** (*1.4*): modal com zoom, setas, ESC, swipe mobile. Sem lib externa ou com `yet-another-react-lightbox`.
- [ ] **T5.2 — Toasts** (*1.6*): adotar `sonner`; substituir mensagens inline de sucesso/erro em upload, exclusão, cópia de link.
- [ ] **T5.3 — Paginação numerada** (*1.5*): componente `Pagination` compartilhado entre galeria pública e interna.
- [ ] **T5.4 — Lixeira com restauração** (depende de D1 = Opção A): rota `/admin/trash` listando `deleted_at IS NOT NULL`, ações restaurar (move de volta do `trash/` + `deleted_at = NULL`) e excluir definitivo.
- [ ] **T5.5 — Endpoint de sincronização em massa**: `GET /api/products/images?since={ISO}` paginado, para o integrador puxar tudo de uma vez (hoje precisa de 1 request por produto). Rate limit próprio. Documentar em `/docs`.
- [ ] **T5.6 — Auditoria**: colunas `created_by`/`deleted_by` (uuid FK auth.users) em `ext_product_images` (migração permitida) + exibição no detalhe.
- [ ] **T5.7 — SEO público** (*1.11*): `sitemap.ts`, `robots.ts`, OG image, `metadataBase`.

---

## Fase 6 — Modernização de stack (oportunista)

Baixo risco individual; fazer quando houver folga, um item por vez.

- [ ] **T6.1 — Turbopack no dev** (*4.6*): `"dev": "next dev --turbopack"`. 5 minutos.
- [ ] **T6.2 — `typedRoutes`** (*4.7*): habilitar e corrigir os hrefs que o build apontar.
- [ ] **T6.3 — Sentry com source maps** (*4.5*): criar org/projeto, `SENTRY_AUTH_TOKEN` no ambiente de build, habilitar `sourcemaps`. Validar com erro de teste.
- [ ] **T6.4 — Tailwind 3 → 4** (*4.2*): rodar `npx @tailwindcss/upgrade`, migrar a cor `brand` para `@theme`, validar dark mode `class`. Fazer em branch separada com revisão visual de todas as telas.
- [ ] **T6.5 — Prettier + lint-staged** (*4.9*): formatar o repo num commit isolado ("format only") para não poluir diffs futuros.
- [ ] **T6.6 — React Compiler** (*4.8*): habilitar `experimental.reactCompiler`, smoke test completo nas telas client-heavy (upload, reordenação).
- [ ] **T6.7 — Web Worker no `processImage`** (*2.8*): só se houver reclamação de travamento com lotes grandes.
- [ ] **T6.8 — Avaliar MV → view normal** (*2.9*): medir o custo da agregação ao vivo com o volume real; se < 50 ms, simplificar removendo o cron.

---

## Regras transversais (valem para todas as fases)

1. **Nunca** tocar em tabelas fora de `ext_product_images` / `ext_api_keys`; migrações novas só nesses objetos e em functions/views `ext_*`.
2. Toda mudança de schema → regenerar `src/types/database.ts` via MCP e atualizar CLAUDE.md.
3. Nada de Supabase Image Transformations (recurso desativado no projeto).
4. Cada fase = 1 branch + PR (ou commits atômicos em `main`, conforme o fluxo atual) + atualização do histórico no CLAUDE.md ao concluir.
5. Antes de cada deploy: `lint`, `tsc --noEmit`, `build` e, a partir da Fase 2, `npm test`.

## Resumo da sequência

| Fase | Tema | Pré-requisito |
|---|---|---|
| 0 | Decisões D1 (exclusão) e D2 (thumbnails) | — |
| 1 | Correções rápidas (busca, mobile, admin, leaks) | — |
| 2 | CI, testes, tipos, zod, modelo de exclusão | D1 |
| 3 | Skeletons, uploads paralelos, ISR, dashboard | Fase 2 (rede de segurança) |
| 4 | TUS, constraint de posição, RPC sem-imagens, thumbnails | D2, Fase 2 |
| 5 | Lightbox, toasts, lixeira, API em massa | D1 p/ lixeira |
| 6 | Stack (Tailwind 4, Sentry maps, Turbopack...) | folga |

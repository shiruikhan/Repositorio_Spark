# Melhorias Propostas — Repositório de Imagens Spark

> **Documento histórico (jun/2026).** Levantamento exploratório; parte dos itens já foi implementada (ver `plano_acao_melhorias.md` e `CLAUDE.md`). Consultar `CLAUDE.md` para o estado atual antes de agir sobre qualquer item aqui.

> Levantamento feito em 11/06/2026 sobre o código atual (Next.js 16, React 19, Supabase, Tailwind 3).
> Nenhuma alteração foi aplicada — este documento lista possibilidades, organizadas por categoria e prioridade.

**Legenda de prioridade**: 🔴 Alta (bug ou lacuna relevante) · 🟡 Média (ganho claro, esforço moderado) · 🟢 Baixa (refinamento)

---

## 1. Layout / UX

### 🔴 1.1 Navegação inexistente no mobile (área logada)
`src/components/Header.tsx` — a nav usa `hidden sm:flex`, ou seja, em telas menores que 640px **não há nenhum link** para Dashboard, Upload, Galeria ou API. Adicionar menu hambúrguer (drawer ou dropdown) para mobile.

### 🟡 1.2 Skeletons de carregamento (`loading.tsx`)
Nenhuma rota tem `loading.tsx`. Como tudo é SSR com `no-store`, a navegação entre páginas fica "travada" até o servidor responder. Adicionar `loading.tsx` com skeletons em `/`, `/gallery`, `/dashboard` e `/gallery/[productCode]` melhora muito a percepção de velocidade (streaming + Suspense já vêm de graça no App Router).

### 🟡 1.3 `error.tsx` por rota
Existe apenas o `ErrorBoundary` global no layout protegido. O App Router tem convenção própria (`error.tsx` / `global-error.tsx`) que se integra melhor com Server Components e permite "Tentar novamente" por segmento.

### 🟡 1.4 Lightbox / zoom na galeria de produto
Em `/gallery/[productCode]` as imagens não têm visualização ampliada. Um lightbox (modal com zoom, navegação por setas, tecla ESC) é padrão esperado em repositório de imagens.

### 🟡 1.5 Paginação com números de página
Hoje é só "← Anterior / Próxima →" (galeria pública e interna). Com muitas páginas, adicionar números (1 … 4 5 6 … 20) e/ou "ir para página".

### 🟡 1.6 Toasts em vez de mensagens inline
Feedback de ações (upload concluído, imagem excluída, link copiado) aparece como texto inline que pode passar despercebido. Uma lib leve como `sonner` (ou toast próprio) padroniza o feedback em todo o app.

### 🟢 1.7 Header usa `<a>` em vez de `<Link>`
`Header.tsx:19` e `:43` usam `<a href>` para `/dashboard` e `/profile`, causando full page reload. Trocar por `next/link` (prefetch + navegação client-side).

### 🟢 1.8 Ícones SVG duplicados inline
Paths SVG copiados em `dashboard/page.tsx`, `gallery/page.tsx`, etc. Extrair para um componente `<Icon name="..."/>` próprio ou adotar `lucide-react` (tree-shakeable). Reduz código e garante consistência visual.

### 🟢 1.9 Acessibilidade
- `alt={img.product_code}` é pouco descritivo — usar `"{descrprod} — alta resolução"` quando disponível.
- Botões só com ícone sem `aria-label` (ThemeToggle, ações do grid).
- Adicionar `focus-visible:ring` consistente nos elementos interativos.
- Estados desabilitados de paginação usam `<span>` com `cursor-not-allowed` — ok, mas adicionar `aria-disabled`.

### 🟢 1.10 Galeria pública: ordenação e filtro por categoria
Hoje só busca + paginação ordenada por `product_code`. A tabela `categoria` já existe no banco — um filtro por categoria e ordenação (mais recentes, A-Z) agregaria valor para os integradores sem mudança de schema.

### 🟢 1.11 SEO da página pública
Falta `app/sitemap.ts`, `app/robots.ts`, Open Graph image e `metadataBase`. A página é pública e indexável; custo baixo, ganho de apresentação ao compartilhar link.

---

## 2. Performance

### 🔴 2.1 Uploads sequenciais no cliente
`useUploadForm.ts:229` — o loop `for` envia um arquivo por vez (upload Storage + Server Action `saveImageRecord` aguardados em série). Com 10 imagens, o tempo é 10× o de uma. Paralelizar em batches de 3–4 (mesmo padrão já usado no ZIP) reduz drasticamente o tempo total.

### 🔴 2.2 Upload de vídeo de até 250 MB sem resumable upload
Upload simples (`storage.upload`) para arquivos grandes é frágil: uma oscilação de rede aos 90% perde tudo. O Supabase Storage suporta **TUS (resumable uploads)** — recomendado para arquivos > 6 MB. Migrar vídeo (e talvez promos PDF grandes) para `tus-js-client` com retry/resume e progresso real (eliminando o `@ts-expect-error` do `onUploadProgress`).

### 🟡 2.3 Dashboard faz 8 queries de contagem
`dashboard/page.tsx:16-34` — 7 counts + 1 select em paralelo. A materialized view `ext_product_images_summary` já tem os counts por tipo: uma única query `select sum(high_count), sum(low_count)...` (ou uma function RPC) substitui 6 das 8 chamadas.

### 🟡 2.4 Filtro "sem imagens" sem paginação e com `NOT IN` crescente
`gallery/page.tsx:32-70` — carrega **todos** os `product_code` com imagem e monta um `NOT IN (...)` na URL do PostgREST (que tem limite de tamanho de URL), e depois renderiza **todos** os produtos sem imagem de uma vez (sem paginação). Funciona com o volume atual, mas degrada com o catálogo. Solução robusta: uma view ou RPC no banco (`LEFT JOIN ... WHERE deleted_at IS NULL AND ext.id IS NULL`) com `range()` para paginar.

### 🟡 2.5 Thumbnails servem a imagem original
`thumb_url` da MV aponta para o arquivo original (potencialmente high-res de vários MB) renderizado num card de ~200px. Opções:
- **Supabase Image Transformations** (`/render/image/public/...?width=400`) — exige plano Pro;
- ou gerar uma variante `thumb` no canvas durante o upload (já existe pipeline de canvas para low).
O `next/image` já otimiza, mas o servidor Next ainda baixa o original a cada cache miss.

### 🟡 2.6 Considerar ISR na galeria pública
`app/page.tsx` usa `force-dynamic` + `no-store` global do `next.config.ts`. Como a MV já tem defasagem de ~1 min, a página pública poderia usar `export const revalidate = 60` (ISR) — TTFB cai de "query no Supabase a cada hit" para HTML cacheado.

### 🟢 2.7 Vazamento de Object URLs nos previews
`useUploadForm.ts:178,186-187` — `URL.createObjectURL` é chamado a cada add/remove sem `revokeObjectURL` dos anteriores. Em sessões longas de upload, memória cresce. Revogar URLs antigas ao recriar a lista e ao desmontar.

### 🟢 2.8 `processImage` na main thread
O resize via canvas roda na thread principal e trava a UI com imagens grandes. `createImageBitmap` + `OffscreenCanvas` em Web Worker mantém a interface responsiva (progressive enhancement — fallback para o código atual).

### 🟢 2.9 Materialized view → view normal?
Com ~373 registros, uma view normal (sem refresh por cron) eliminaria a defasagem de 1 min e o cron. A MV só se justifica se o catálogo crescer muito. Avaliar custo da query agregada ao vivo.

---

## 3. Robustez / Correção

### 🔴 3.1 Injeção de filtro PostgREST na busca
`app/page.tsx:50` e `gallery/page.tsx:109` interpolam `q` direto em `.or(\`product_code.ilike.%${q}%,...\`)`. Não é SQL injection, mas caracteres como `,`, `(`, `)` quebram o parser do PostgREST (busca retorna erro 400) e permitem injetar operadores de filtro arbitrários. Sanitizar (`q.replace(/[,()]/g, "")`) ou usar `.ilike()` em duas queries / `textSearch`.

### 🔴 3.2 Soft delete inconsistente: o arquivo é apagado fisicamente
`actions/images.ts:63,96` — o registro recebe `deleted_at` (soft delete), mas o arquivo do Storage é **removido fisicamente**. Resultado: a "lixeira" lógica aponta para arquivos que não existem; restauração é impossível e `public_url` de registros deletados fica quebrada se algo ainda referenciar. Decidir um modelo: (a) mover arquivo para prefixo `trash/` com limpeza agendada, ou (b) assumir delete físico e remover a coluna/conceito de soft delete.

### 🟡 3.3 Race condition em `getNextPosition`
O cliente busca a próxima posição e depois insere (`useUploadForm.ts:224`). Dois uploads simultâneos para o mesmo produto/tipo colidem em `position`. Mitigações: constraint `UNIQUE (product_code, resolution_type, position) WHERE deleted_at IS NULL` + retry, ou calcular a posição dentro do INSERT via RPC.

### 🟡 3.4 Validação de entrada nas Server Actions
As actions confiam no shape dos argumentos vindos do cliente. Adicionar validação com `zod` (productCode numérico, resolutionType no enum, position int ≥ 0, arrays limitados) — barato e elimina classes de erro silencioso. O RLS protege o banco, mas mensagens de erro claras melhoram o diagnóstico.

### 🟡 3.5 Server Actions não verificam `is_admin`
As actions de escrita checam apenas sessão ativa; quem bloqueia não-admins é o RLS (que retorna erro genérico ou simplesmente 0 linhas afetadas — `update` sem match **não** retorna erro, então `setFeaturedImage` de um não-admin "sucede" silenciosamente). Checar `is_admin` no início da action e retornar mensagem explícita.

### 🟡 3.6 `reorderImages` com `upsert` pode violar RLS parcialmente
`upsert` em lote: se uma linha falhar, o comportamento é tudo-ou-nada do PostgREST, mas não há verificação de que todos os `id`s pertencem ao `productCode` informado. Validar no servidor (ou via RPC) que os ids são do produto.

### 🟢 3.7 `x-forwarded-for` é confiável só atrás de proxy
`lib/ratelimit.ts:51` — se o Node ficar exposto diretamente (sem o proxy do Hostinger na frente), o header é spoofável e o rate limit é contornável. Documentar a premissa ou validar contra lista de proxies confiáveis.

### 🟢 3.8 Headers de cache legados
`next.config.ts` envia `Pragma` e `Expires` (HTTP/1.0, obsoletos) — `Cache-Control: no-store` já basta para todos os browsers/CDNs modernos. Limpeza cosmética.

---

## 4. Tecnologia / Stack

### 🔴 4.1 Zero testes e zero CI
Não há nenhum teste (`*.test.*` = 0) nem workflow (`.github/` não existe). Mínimo recomendado:
- **Vitest** para unidades puras: `lib/naming.ts`, `lib/ratelimit.ts`, `uploadUtils.ts` (validações), parsing de filtros da galeria;
- **GitHub Actions**: `lint` + `tsc --noEmit` + `next build` em cada push (o deploy já é via GitHub — o CI vira gate antes do deploy);
- (Opcional) **Playwright** para smoke: login → upload → galeria → API pública.

### 🟡 4.2 Tailwind CSS 3 → 4
O projeto está no Tailwind 3.4. A v4 (CSS-first, `@theme`, sem `tailwind.config.ts`, build mais rápido via Lightning CSS) é a versão atual e a migração deste projeto seria pequena (1 cor de brand customizada, dark mode `class`). Ganho: build mais rápido e stack alinhada.

### 🟡 4.3 `sharp` em devDependencies
`package.json` — `sharp` está em `devDependencies`. O Next.js 15+ embute sharp para otimização de imagens em produção, então provavelmente é redundante; mas se algum script de produção depender dele, deveria estar em `dependencies`. Verificar uso (parece ser só de `scripts/`) e remover ou mover.

### 🟡 4.4 Tipos gerados não são usados nas queries
`src/types/database.ts` existe, mas `createClient` é chamado sem o generic (`createClient<Database>(...)`) e a galeria faz casts manuais (`row.product_code as string`). Tipar os clients elimina os casts e pega divergências de schema em build time.

### 🟡 4.5 Sentry sem source maps
`next.config.ts` desativa upload de source maps — stack traces em produção virão minificados/ilegíveis. Criar projeto/org no Sentry, configurar `SENTRY_AUTH_TOKEN` e habilitar `sourcemaps` torna o Sentry de fato útil para depurar.

### 🟢 4.6 Turbopack no dev
`next dev --turbopack` (estável no Next 16) acelera HMR significativamente. Mudança de uma linha no script `dev`.

### 🟢 4.7 `typedRoutes`
`experimental.typedRoutes: true` no `next.config.ts` valida todos os `href` em build time — útil num app com muitos links construídos manualmente (`/gallery?filter=...`).

### 🟢 4.8 React Compiler
Next 16 suporta o React Compiler (`experimental.reactCompiler`). Elimina necessidade de memoização manual nos componentes client (UploadForm, ImageGrid). Baixo risco, ganho moderado.

### 🟢 4.9 Prettier + lint-staged
Sem formatador configurado. `prettier` + `husky`/`lint-staged` mantém estilo consistente sem esforço (o código atual já é consistente, mas é manual).

---

## 5. Funcionalidades novas (ideias)

| Ideia | Valor | Esforço |
|---|---|---|
| **Lixeira com restauração** — listar registros `deleted_at IS NOT NULL` e permitir restaurar (depende da decisão 3.2) | Alto | Médio |
| **Auditoria** — registrar quem subiu/excluiu cada arquivo (coluna `created_by`/`deleted_by` FK auth.users) | Médio | Baixo |
| **Webhook/notificação para integradores** — avisar quando produto X ganhar imagens novas | Alto p/ integrador | Médio |
| **Endpoint de listagem em massa** — `GET /api/products/images?since=...` para o integrador sincronizar tudo sem N requests | Alto p/ integrador | Baixo |
| **Estatísticas de uso da API** — contadores por API key (já existe `last_used_at`; adicionar contagem/log) | Médio | Baixo |
| **Upload com crop/ajuste** — editor simples antes de enviar (crop quadrado, fundo branco) | Médio | Alto |
| **Versionamento de imagem** — substituir mantendo histórico | Baixo | Alto |

---

## 6. Sugestão de ordem de ataque

1. **Rodada de bugs/robustez (rápida)**: 3.1 sanitizar busca · 1.1 menu mobile · 3.5 checagem `is_admin` · 2.7 revoke de Object URLs · 1.7 `<Link>` no header.
2. **Decisão de produto**: 3.2 (soft delete vs delete físico) — define a feature de lixeira.
3. **Qualidade de base**: 4.1 CI + primeiros testes · 4.4 tipar clients Supabase.
4. **Performance percebida**: 1.2 loading skeletons · 2.1 uploads paralelos · 2.6 ISR na home pública.
5. **Evoluções maiores**: 2.2 TUS para vídeos · 2.4 RPC "sem imagens" · 1.4 lightbox · 4.2 Tailwind 4.

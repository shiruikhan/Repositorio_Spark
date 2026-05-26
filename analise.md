# Análise de Melhorias e Otimizações — Repositório de Imagens Spark

> Gerado em 2026-05-26 com base em auditoria completa do código, banco Supabase e infraestrutura.

---

## 1. Performance

### 1.1 `reorderImages` faz N queries individuais
**Arquivo:** `src/app/actions/images.ts:72`  
**Problema:** Cada reordenação dispara um `UPDATE` por imagem em paralelo via `Promise.all`. Com 10 imagens, são 10 round-trips ao banco.  
**Solução:** Usar um único `upsert` com array ou uma stored procedure batch.

```ts
// Atual: N round-trips
await Promise.all(updates.map(({ id, position }) =>
  supabase.from("ext_product_images").update({ position }).eq("id", id)
));

// Melhor: upsert em lote
await supabase.from("ext_product_images").upsert(
  updates.map(({ id, position }) => ({ id, position })),
  { onConflict: "id" }
);
```

---

### 1.2 Filtro "sem-imagens" carrega tudo na memória
**Arquivo:** `src/app/(protected)/gallery/page.tsx:29`  
**Problema:** Busca todos os produtos E todas as imagens ativas para calcular a diferença no servidor. À medida que o catálogo cresce, isso escala mal.  
**Solução:** Mover o cálculo para o banco com `LEFT JOIN ... WHERE ext_product_images.product_code IS NULL`.

```sql
SELECT p.codprod::text AS product_code, p.descrprod
FROM produto p
LEFT JOIN (
  SELECT DISTINCT product_code
  FROM ext_product_images WHERE deleted_at IS NULL
) e ON e.product_code = p.codprod::text
WHERE e.product_code IS NULL
ORDER BY p.codprod;
```

---

### 1.3 Galeria pública sem paginação
**Arquivo:** `src/app/page.tsx:34`  
**Problema:** A página pública (`/`) busca todos os produtos com imagens da view `ext_product_images_summary` de uma vez — atualmente ~508 registros. Com catálogo completo pode passar de mil.  
**Solução:** Adicionar paginação com cursor ou limit/offset na query, e lazy load com IntersectionObserver no `PublicGallery`.

---

### 1.4 `next.config.ts` força `no-store` em todos os assets estáticos
**Arquivo:** `next.config.ts:6`  
**Problema:** O header `no-store` está aplicado a `/(.*)`—incluindo os arquivos JS/CSS/fontes do Next.js. Isso desabilita o cache do browser até para bundles imutáveis, gerando redownload em toda navegação.  
**Solução:** Aplicar o `no-store` apenas às rotas de HTML (`/(login|dashboard|gallery|upload|docs|profile|admin)(.*)`), deixando `/_next/static/(.*)` sem o override.

```ts
// Só aplica no-store em rotas dinâmicas, não em assets estáticos
{ source: "/((?!_next/static|_next/image|favicon).*)", headers: [...] }
```

---

### 1.5 Endpoint ZIP monta arquivo inteiro em memória
**Arquivo:** `src/app/api/products/[productCode]/zip/route.ts:66`  
**Problema:** Baixa até 200 imagens em paralelo com `Promise.all` e constrói o ZIP completo em RAM antes de enviar. Para um produto com muitas imagens de alta resolução isso pode exceder os limites de memória do Hostinger.  
**Sugestão:** Limitar a concorrência do download (ex: grupos de 5–10 por vez) e considerar streaming do ZIP com `archiver` ou `jszip` em modo stream.

---

### 1.6 View `ext_product_images_summary` recalcula a cada requisição
**Banco:** view comum, não materializada.  
**Problema:** Toda abertura da galeria e do dashboard recalcula `COUNT(*) FILTER`, `array_agg`, `MAX` sobre `ext_product_images`. Com 508 registros ainda é rápido, mas escala quadraticamente.  
**Solução de curto prazo:** Nenhuma (índice parcial já existe e cobre bem).  
**Solução de médio prazo:** Converter para `MATERIALIZED VIEW` com `REFRESH ... CONCURRENTLY` acionado por trigger `AFTER INSERT/UPDATE/DELETE` em `ext_product_images`.

---

## 2. Banco de Dados

### 2.1 `product_code` sem chave estrangeira real
**Tabela:** `ext_product_images.product_code`  
**Problema:** O campo é `text` com referência informal a `produto.codprod bigint`. Não existe FK, então registros órfãos são possíveis se um produto for removido do ERP.  
**Sugestão:** Documentar como decisão intencional (produtos podem existir antes de entrar no catálogo interno), mas adicionar um índice gin ou constraint de verificação de formato no `product_code` para evitar valores malformados.

---

### 2.2 `produto_imagem` tem 336 registros não importados
**Banco:** tabela `produto_imagem`, 336 URLs da integração ERP.  
**Oportunidade:** Esses registros representam imagens já mapeadas pelo ERP (campo `url` text, campo `ordem`). Uma migration ou Server Action de importação poderia criar registros em `ext_product_images` com `resolution_type = 'high'` e `public_url` já preenchido, economizando re-upload manual.

---

## 3. Segurança

### 3.1 Sem rate limiting nas rotas públicas
**Arquivos:** `/api/products/[productCode]/images`, `/api/products/[productCode]/zip`  
**Problema:** Ambas são públicas, sem autenticação obrigatória e sem qualquer controle de taxa. A rota `/zip` é especialmente custosa (download + montagem em memória). Um atacante pode disparar centenas de requisições simultâneas.  
**Solução:** Adicionar middleware de rate limiting com base em IP. No ecossistema Next.js/Vercel: `@upstash/ratelimit` + Redis (Upstash). No Hostinger pode-se implementar via `X-Forwarded-For` + cache em memória simples.

```ts
// Exemplo básico server-side
const ip = req.headers.get("x-forwarded-for") ?? "anon";
const key = `zip_${ip}`;
// limitar: 10 req/min por IP
```

---

### 3.2 `window.confirm` em ImageGrid (anti-padrão)
**Arquivo:** `src/app/(protected)/gallery/[productCode]/ImageGrid.tsx:132`  
**Problema:** `window.confirm` é bloqueado em alguns contextos (iframes, PWAs) e tem visual inconsistente entre browsers.  
**Solução:** Substituir pelo mesmo padrão de modal já usado em `GalleryGrid.tsx` (`showConfirm` state + modal customizado).

---

### 3.3 Service Role Key exposta em rota pública
**Arquivo:** `src/app/api/products/[productCode]/images/route.ts:37`  
**Situação atual:** A rota usa `SUPABASE_SERVICE_ROLE_KEY` para validar a API Key do usuário e atualizar `last_used_at`. Como é uma variável de ambiente server-side, ela não vaza para o cliente.  
**Observação de hardening:** A validação da API Key poderia usar a anon key + RLS permissiva de SELECT em `ext_api_keys`, evitando expor a service role neste contexto. Isso reduziria o blast radius se a rota tiver uma vulnerabilidade futura.

---

## 4. Qualidade de Código

### 4.1 `CopyButton` duplicado
**Arquivos:** `src/app/(protected)/upload/UploadForm.tsx:511` e `src/components/CopyButton.tsx`  
**Problema:** Há uma implementação local de `CopyButton` dentro de `UploadForm.tsx` idêntica ao componente compartilhado. Qualquer mudança precisa ser feita em dois lugares.  
**Solução:** Remover a definição local e importar `CopyButton` de `@/components/CopyButton`.

---

### 4.2 `UploadForm.tsx` com 510 linhas
**Arquivo:** `src/app/(protected)/upload/UploadForm.tsx`  
**Problema:** O componente acumula lógica de validação, processamento de imagem (canvas), upload, preview e UI de resultado em um único arquivo. Difícil de testar e manter.  
**Sugestão de refatoração:**
- `useUploadForm.ts` — hook com toda a lógica de estado
- `FileDropzone.tsx` — componente de drop zone
- `FilePreviewGrid.tsx` — grid de previews

---

### 4.3 Casts manuais na galeria por falta de tipos gerados
**Arquivo:** `src/app/(protected)/gallery/page.tsx:101`  
**Problema:** A view `ext_product_images_summary` não tem tipos TypeScript gerados, resultando em `row.product_code as string`, `row.total_images as number`.  
**Solução:** Executar `supabase gen types typescript` (via MCP `generate_typescript_types`) e adicionar ao build pipeline. Elimina todos os casts e detecta mudanças de schema em tempo de compilação.

---

### 4.4 Sem tratamento de erro global nos componentes client
**Arquivos:** `ImageGrid.tsx`, `GalleryGrid.tsx`, `UploadForm.tsx`  
**Problema:** Se uma Server Action lançar uma exceção inesperada, o componente silencia ou apresenta um estado indefinido. Não há `ErrorBoundary` nos layouts protegidos.  
**Solução:** Adicionar um `<ErrorBoundary>` no `src/app/(protected)/layout.tsx` para capturar falhas em render e exibir uma mensagem de erro amigável.

---

## 5. UX / Features

### 5.1 Nenhuma sugestão de produto no campo de código do upload
**Arquivo:** `src/app/(protected)/upload/UploadForm.tsx:271`  
**Problema:** O usuário precisa digitar o código manualmente sem feedback. Códigos errados resultam em imagens vinculadas a produtos inexistentes.  
**Solução:** Adicionar um `datalist` HTML populado com os `codprod` e `descrprod` do catálogo, ou um combobox com busca assíncrona à medida que digita.

---

### 5.2 Vídeos sem preview inline
**Arquivo:** `src/app/(protected)/gallery/[productCode]/page.tsx:162`  
**Problema:** Vídeos aparecem apenas com ícone e link de download. O usuário não consegue ver o conteúdo sem baixar.  
**Solução:** Substituir o ícone por um elemento `<video controls>` com `src={item.public_url}` para vídeos (MP4, WebM, MOV).

---

### 5.3 Documentação `/docs` não cobre o endpoint `/zip`
**Arquivo:** `src/app/(protected)/docs/page.tsx`  
**Problema:** O endpoint `/api/products/{code}/zip` existe e funciona, mas não está documentado na página de docs nem nos exemplos cURL.  
**Solução:** Adicionar uma seção "Download ZIP" na página de documentação com exemplo de uso, limites (200 arquivos, 200 MB) e organização das pastas.

---

### 5.4 Dashboard sem filtro ou acesso rápido por tipo
**Arquivo:** `src/app/(protected)/dashboard/page.tsx`  
**Problema:** Os "últimos uploads" mostram apenas 6 itens sem diferenciação de tipo. Não há atalho para ver "todos os vídeos" ou "todos os manuais".  
**Sugestão:** Adicionar um mini-resumo por tipo (cards de contagem separados para manual/promo/video) e atalhos diretos para a galeria filtrada.

---

### 5.5 Sem feedback visual de qual produto o arquivo será associado
**Arquivo:** `src/app/(protected)/upload/UploadForm.tsx`  
**Problema:** Após digitar o código, não há confirmação visual do nome do produto. O usuário não sabe se está associando à entidade correta.  
**Solução:** Adicionar uma busca assíncrona ao `onBlur` do campo de código que exibe o `descrprod` do produto encontrado (ou "Produto não encontrado no catálogo" sem bloquear o upload).

---

## 6. Infraestrutura e Deploy

### 6.1 Sem endpoint de health check
**Problema:** Não há rota `/api/health` ou similar. Monitoramento externo (UptimeRobot, BetterUptime) não tem como verificar se a aplicação está respondendo corretamente.  
**Solução:** Adicionar `src/app/api/health/route.ts` que retorna `{ status: "ok", ts: Date.now() }` com status 200.

---

### 6.2 Sem rastreamento de erros em produção
**Problema:** Erros de runtime no Hostinger não são capturados em nenhuma ferramenta de observabilidade. Falhas de Server Actions são silenciosas para quem opera o sistema.  
**Solução:** Integrar Sentry (`@sentry/nextjs`) com configuração mínima: captura de Server Action errors, erros de rota e rate limiting de eventos.

---

### 6.3 Prebuild destrói `.next` antes de buildar
**Arquivo:** `package.json:7` — `"prebuild": "node -e \"...fs.rmSync('.next'...)\"`  
**Problema:** No Hostinger, o processo de build remove o diretório `.next` primeiro. Isso significa que durante o build há um período sem a versão antiga disponível para servir, causando downtime.  
**Solução:** Usar `next build` sem prebuild de remoção — o Next.js já gerencia o `.next` de forma atômica. Remover o script `prebuild` ou condicioná-lo apenas ao ambiente local de desenvolvimento.

---

### 6.4 Cron jobs sem autenticação explícita nos headers
**Banco:** cron jobs 1–11  
**Observação:** Todos os cron jobs chamam Edge Functions sem `Authorization` header. Se as funções não verificam o método de invocação, qualquer requisição não autenticada à URL da função pode disparar a lógica.  
**Ação:** Verificar se as Edge Functions (`sync-produtos`, `integrar-pedidos`, etc.) validam que a chamada veio do cron (ex: secret no body ou header customizado).

---

## 7. Oportunidades Futuras (backlog)

| # | Item | Impacto | Esforço |
|---|------|---------|---------|
| A | Importar 336 registros de `produto_imagem` para `ext_product_images` | Alto | Baixo |
| B | Tipos TypeScript gerados via Supabase CLI | Médio | Baixo |
| C | Rate limiting nos endpoints públicos | Alto | Médio |
| D | Reordenação em batch (eliminar N+1) | Médio | Baixo |
| E | Health check endpoint | Médio | Baixo |
| F | Modal de confirmação em ImageGrid (substituir `window.confirm`) | Médio | Baixo |
| G | Preview inline de vídeos | Médio | Baixo |
| H | Documentar `/zip` na página /docs | Baixo | Baixo |
| I | Autocomplete de produto no upload | Médio | Médio |
| J | Paginação na galeria pública | Alto | Médio |
| K | Cache `no-store` apenas em rotas de HTML | Baixo | Baixo |
| L | Materialized view para o summary | Baixo | Médio |
| M | Sentry ou equivalente para erros em produção | Alto | Médio |
| N | Refatoração de `UploadForm.tsx` | Baixo | Alto |

---

## Resumo Executivo

O projeto está **funcionalmente completo e em produção** com 508 imagens, 5 tipos de arquivo suportados, API pública documentada e 10 cron jobs de sincronização ativos. As principais oportunidades de melhoria são:

1. **Segurança imediata:** rate limiting nas rotas públicas (especialmente `/zip`)
2. **Correção de UX:** substituir `window.confirm` por modal em `ImageGrid`
3. **Qualidade:** eliminar `CopyButton` duplicado, gerar tipos do Supabase
4. **Performance:** corrigir N+1 no `reorderImages`, restringir `no-store` a rotas HTML
5. **Observabilidade:** health check + rastreamento de erros em produção

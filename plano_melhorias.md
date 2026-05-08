# Plano de Melhorias — Spark Product Images

## Contexto
O sistema de gestão de imagens está funcional em todas as fases planejadas. Este plano adiciona melhorias operacionais: exclusão segura de imagens, reordenação, redimensionamento automático, filtros na galeria, paginação, progresso de upload, validação de dimensões mínimas e preview de API.

A principal dependência arquitetural é o **soft delete** (Task 1): ele é pré-requisito técnico para Tasks 2 e 3, por isso é executado primeiro.

---

## Ordem de Execução

| # | Task | Prioridade | Depende de |
|---|------|-----------|-----------|
| 1 | **Soft delete** — migração SQL + filtros em todas as queries | BASE | — |
| 2 | **Excluir imagens** — botão delete com confirmação | ALTA | #1 |
| 3 | **Reordenar imagens** — drag-and-drop por grupo de resolução | ALTA | #2 (compartilha actions) |
| 4 | **Redimensionar low-res** — canvas API, max 800px | ALTA | — |
| 5 | **Filtros na galeria** — chips URL-driven | MÉDIA | #1 |
| 6 | **Paginação** — 24 produtos/página, view SQL | MÉDIA | #1 |
| 7 | **Progresso por arquivo** — barra visual no upload | MÉDIA | — |
| 8 | **Validação de dimensões** — mín. 300×300px no addFiles | BAIXA | — |
| 9 | **Preview JSON da API** — `<details>` collapsível no detalhe | BAIXA | #1 |

---

## Task 1 — Soft Delete (pré-requisito)

### SQL no Supabase SQL Editor
```sql
ALTER TABLE ext_product_images
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_ext_product_images_active
  ON ext_product_images (product_code, deleted_at)
  WHERE deleted_at IS NULL;
```

### Filtros a adicionar em todas as queries existentes
Adicionar `.is("deleted_at", null)` em:

| Arquivo | Local |
|---------|-------|
| `src/app/(protected)/gallery/page.tsx` | query principal |
| `src/app/(protected)/gallery/[productCode]/page.tsx` | query de imagens |
| `src/app/(protected)/dashboard/page.tsx` | 3 queries: `totalImages`, `totalProducts`, `recent` |
| `src/app/actions/upload.ts` | `getNextPosition()` |
| `src/app/api/products/[productCode]/images/route.ts` | endpoint público GET |

### Verificação
Confirmar no Supabase Table Editor que a coluna `deleted_at` existe com valor NULL. Dashboard deve mostrar mesmos totais de antes.

---

## Task 2 — Excluir Imagens

### Arquivo novo: `src/app/actions/images.ts`
```ts
"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function deleteImage(id: string, filePath: string, productCode: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Sessão expirada." };

  // Soft delete no banco
  const { error } = await supabase
    .from("ext_product_images")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null);
  if (error) return { ok: false, message: error.message };

  // Remove do Storage
  await createAdminClient().storage.from("product-assets").remove([filePath]);

  revalidatePath(`/gallery/${encodeURIComponent(productCode)}`);
  revalidatePath("/gallery");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function reorderImages(updates: { id: string; position: number }[], productCode: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Sessão expirada." };

  await Promise.all(
    updates.map(({ id, position }) =>
      supabase.from("ext_product_images").update({ position }).eq("id", id).is("deleted_at", null)
    )
  );

  revalidatePath(`/gallery/${encodeURIComponent(productCode)}`);
  return { ok: true };
}
```

### Arquivo novo: `src/app/(protected)/gallery/[productCode]/ImageGrid.tsx`
- `"use client"` component
- Recebe `images: ImageRow[]` como prop
- Agrupa por `resolution_type` com `useState`
- Move as funções `Section` e `ImageCard` do `page.tsx` para cá
- `ImageCard` ganha botão delete: `window.confirm()` → `startTransition(() => deleteImage(...))` → spinner enquanto pendente

### Arquivo modificado: `src/app/(protected)/gallery/[productCode]/page.tsx`
- Remove funções `Section` e `ImageCard` (movidas para `ImageGrid.tsx`)
- Importa e renderiza `<ImageGrid images={images} productCode={code} />`
- Mantém o page como Server Component

### UI do botão de delete
Ícone de lixeira no rodapé do card, ao lado de `CopyButton`/`DownloadButton`.  
Estilo: `hover:text-red-600 hover:border-red-400`. Spinner + disabled enquanto pendente.

### Verificação
Clicar no lixo → dialog de confirmação → card desaparece → Supabase mostra `deleted_at` preenchido → arquivo removido do bucket.

---

## Task 3 — Reordenar por Drag-and-Drop

### Arquivo modificado: `src/app/(protected)/gallery/[productCode]/ImageGrid.tsx`
(adicionado ao componente da Task 2)

- Estado: `const [highRes, setHighRes] = useState(...)` e `const [lowRes, setLowRes]`
- Refs: `dragIndex = useRef<number|null>(null)`, `dragGroup = useRef<"high"|"low"|null>(null)`
- Cada card div: `draggable`, `onDragStart`, `onDragOver` (`e.preventDefault()`), `onDrop`
- No drop: reordena array com splice → UI otimista → chama `reorderImages` via `startTransition`
- Drag apenas dentro do mesmo grupo (high ↔ high, low ↔ low)
- Feedback visual: `opacity-50` no card arrastado + ícone de grip visível no hover

### Verificação
Arrastar card → UI atualiza imediatamente → recarregar página → ordem persistida no banco.

---

## Task 4 — Redimensionar Low-Res com Canvas

### Arquivo modificado: `src/app/(protected)/upload/UploadForm.tsx`

Adicionar função (mesmo arquivo ou `src/lib/resizeImage.ts`):

```ts
async function resizeIfLow(file: File, resolutionType: ResolutionType): Promise<File> {
  if (resolutionType !== "low") return file;
  const MAX_WIDTH = 800;
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      if (img.naturalWidth <= MAX_WIDTH) { resolve(file); return; }
      const scale = MAX_WIDTH / img.naturalWidth;
      const canvas = document.createElement("canvas");
      canvas.width = MAX_WIDTH;
      canvas.height = Math.round(img.naturalHeight * scale);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => resolve(blob ? new File([blob], file.name, { type: "image/jpeg" }) : file),
        "image/jpeg", 0.88
      );
    };
    img.src = url;
  });
}
```

No loop de upload em `handleSubmit`, antes do `storage.upload()`:
```ts
const fileToUpload = await resizeIfLow(file, resolutionType);
// usar fileToUpload no upload e fileToUpload.type como contentType
```

### Verificação
Upload de PNG >800px com resolução "low" → arquivo no bucket tem largura ≤ 800px.

---

## Task 5 — Filtros na Galeria

### Arquivo modificado: `src/app/(protected)/gallery/page.tsx`

**Lógica de query por filtro** (via `searchParams.filter`):

| Valor | Query extra |
|-------|------------|
| `"apenas-high"` | `.eq("resolution_type", "high")` |
| `"apenas-low"` | `.eq("resolution_type", "low")` |
| `"recentes"` | `.gte("created_at", 7 dias atrás)` |
| `"sem-imagens"` | busca todos `codprod` da tabela `produto`, subtrai os que têm imagens |
| padrão / `"todos"` | só `.is("deleted_at", null)` |

**UI:** chips `<Link>` acima do grid, preservando `q` e `page`:
```
[Todos] [Apenas high-res] [Apenas low-res] [Recentes] [Sem imagens]
```
Chip ativo: fundo brand + texto branco. Inativo: borda cinza.

Cards de "Sem imagens": placeholder + "0 imagens" + link para `/upload?code={codprod}`.

### Verificação
`/gallery?filter=sem-imagens` → produtos sem imagem. `/gallery?filter=apenas-high` → só com high-res. Busca `q=` funciona junto com filtro.

---

## Task 6 — Paginação

### SQL no Supabase (view somente-leitura, não toca em tabelas existentes)
```sql
CREATE OR REPLACE VIEW ext_product_images_summary AS
SELECT
  product_code,
  COUNT(*) FILTER (WHERE deleted_at IS NULL) AS total_images,
  COUNT(*) FILTER (WHERE resolution_type = 'high' AND deleted_at IS NULL) AS high_count,
  COUNT(*) FILTER (WHERE resolution_type = 'low' AND deleted_at IS NULL) AS low_count,
  MAX(created_at) FILTER (WHERE deleted_at IS NULL) AS last_upload,
  (array_agg(public_url ORDER BY created_at DESC)
    FILTER (WHERE resolution_type = 'low' AND deleted_at IS NULL))[1] AS thumb_url
FROM ext_product_images
GROUP BY product_code
HAVING COUNT(*) FILTER (WHERE deleted_at IS NULL) > 0;
```

### Arquivo modificado: `src/app/(protected)/gallery/page.tsx`
- `const PAGE_SIZE = 24`
- `const pageNum = Math.max(1, parseInt(searchParams.page ?? "1"))`
- `const offset = (pageNum - 1) * PAGE_SIZE`
- Substituir query atual pela view `ext_product_images_summary` com `.range(offset, offset + PAGE_SIZE - 1)`
- Count total com `{ count: "exact", head: true }`
- Remover loop de agrupamento em JS (a view já agrupa)
- Controles no rodapé: `<Link>Anterior</Link>` / `<Link>Próxima</Link>` + "Página X de Y"

### Verificação
>24 produtos → página 1 mostra 24 → "Próxima" mostra restante. Params `q` e `filter` preservados.

---

## Task 7 — Progresso por Arquivo no Upload

### Arquivo modificado: `src/app/(protected)/upload/UploadForm.tsx`

- Trocar `progress: string` por `fileProgress: Map<number, number>`
- No `storage.upload()`, adicionar callback:
  ```ts
  onUploadProgress: (evt) => {
    const pct = Math.round((evt.loaded / evt.total) * 100);
    setFileProgress(prev => new Map(prev).set(i, pct));
  }
  ```
- Renderizar bloco acima do botão submit (visível só quando `pending === true`):
  ```tsx
  {files.map((file, i) => (
    <div key={i}>
      <div className="flex justify-between text-xs text-gray-500 mb-0.5">
        <span className="truncate max-w-[70%]">{file.name}</span>
        <span>{fileProgress.get(i) ?? 0}%</span>
      </div>
      <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div className="h-full bg-brand transition-all" style={{ width: `${fileProgress.get(i) ?? 0}%` }} />
      </div>
    </div>
  ))}
  ```
- Limpar `fileProgress` ao terminar

### Verificação
3+ arquivos grandes → cada um mostra barra individual preenchendo de 0% a 100%.

---

## Task 8 — Validação de Dimensões Mínimas

### Arquivo modificado: `src/app/(protected)/upload/UploadForm.tsx`

```ts
function checkDimensions(file: File): Promise<{ ok: boolean; width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({
        ok: img.naturalWidth >= 300 && img.naturalHeight >= 300,
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve({ ok: false, width: 0, height: 0 }); };
    img.src = url;
  });
}
```

- `addFiles` vira `async`
- Antes de adicionar cada arquivo, checar dimensões
- Rejeitados → estado `dimensionErrors: string[]` → bloco de aviso laranja listando arquivos com dimensões reais

### Verificação
Enviar imagem 100×100px → não entra na fila → mensagem: `arquivo.jpg (100×100px — mín. 300×300px)`.

---

## Task 9 — Preview JSON da API no Detalhe do Produto

### Arquivo modificado: `src/app/(protected)/gallery/[productCode]/page.tsx`

Construir JSON a partir do array `images` já carregado (sem fetch adicional):
```ts
const apiPreview = JSON.stringify({
  product_code: code,
  total: images.length,
  images: images.map(({ id, resolution_type, position, public_url, created_at }) =>
    ({ id, resolution_type, position, public_url, created_at })
  ),
}, null, 2);
```

Renderizar com elemento HTML nativo (sem client component):
```tsx
<details className="bg-gray-900 rounded-xl overflow-hidden">
  <summary className="cursor-pointer px-4 py-3 text-xs font-semibold text-gray-400 hover:text-gray-200 select-none">
    Prévia JSON da API — GET /api/products/{code}/images
  </summary>
  <pre className="px-4 pb-4 text-xs text-green-300 font-mono overflow-auto max-h-72">
    {apiPreview}
  </pre>
</details>
```

### Verificação
`/gallery/{code}` → elemento fechado → clicar abre → JSON bate com retorno real do endpoint.

---

## Resumo de Arquivos

### Novos
| Arquivo | Conteúdo |
|---------|----------|
| `src/app/actions/images.ts` | `deleteImage()`, `reorderImages()` |
| `src/app/(protected)/gallery/[productCode]/ImageGrid.tsx` | Client Component com delete + DnD |

### Modificados
| Arquivo | Tasks |
|---------|-------|
| `src/app/(protected)/gallery/[productCode]/page.tsx` | #1, #2, #9 |
| `src/app/(protected)/gallery/page.tsx` | #1, #5, #6 |
| `src/app/(protected)/dashboard/page.tsx` | #1 |
| `src/app/actions/upload.ts` | #1 |
| `src/app/api/products/[productCode]/images/route.ts` | #1 |
| `src/app/(protected)/upload/UploadForm.tsx` | #4, #7, #8 |

### SQL
| Operação | Task |
|----------|------|
| `ALTER TABLE ext_product_images ADD COLUMN deleted_at` | #1 |
| `CREATE INDEX idx_ext_product_images_active` | #1 |
| `CREATE OR REPLACE VIEW ext_product_images_summary` | #6 |

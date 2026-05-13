import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type FilterType = "todos" | "apenas-high" | "apenas-low" | "recentes" | "sem-imagens";

const PAGE_SIZE = 24;

interface Props {
  searchParams: Promise<{ q?: string; filter?: string; page?: string }>;
}

const FILTER_CHIPS: { value: FilterType; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "apenas-high", label: "Apenas high-res" },
  { value: "apenas-low", label: "Apenas low-res" },
  { value: "recentes", label: "Recentes (7d)" },
  { value: "sem-imagens", label: "Sem imagens" },
];

export default async function GalleryPage({ searchParams }: Props) {
  const { q, filter, page } = await searchParams;
  const activeFilter = (filter as FilterType) || "todos";
  const pageNum = Math.max(1, parseInt(page ?? "1"));
  const offset = (pageNum - 1) * PAGE_SIZE;
  const supabase = await createClient();

  // "Sem imagens": fetch all codprod from produto, subtract those with images
  if (activeFilter === "sem-imagens") {
    const [{ data: allProducts }, { data: withImages }] = await Promise.all([
      supabase.from("produto").select("codprod, descrprod"),
      supabase.from("ext_product_images").select("product_code").is("deleted_at", null),
    ]);
    const codesWithImages = new Set((withImages ?? []).map((r) => String(r.product_code)));
    let noImageProducts = (allProducts ?? [])
      .map((r) => ({ code: String(r.codprod), name: r.descrprod as string | null }))
      .filter((r) => !codesWithImages.has(r.code));
    if (q?.trim()) {
      const search = q.trim().toLowerCase();
      noImageProducts = noImageProducts.filter(
        (r) => r.code.includes(search) || r.name?.toLowerCase().includes(search)
      );
    }
    return (
      <GalleryLayout q={q} activeFilter={activeFilter}>
        {noImageProducts.length === 0 ? (
          <EmptyState q={q} filter={activeFilter} />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {noImageProducts.map(({ code, name }) => (
              <Link
                key={code}
                href={`/upload?code=${encodeURIComponent(code)}`}
                className="group bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden hover:border-brand hover:shadow-md transition"
              >
                <div className="w-full h-36 bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-300 dark:text-gray-600">
                  <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="p-3">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">Cód: {code}</p>
                  {name && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{name}</p>}
                  <p className="text-xs text-gray-400 mt-0.5">0 imagens</p>
                  <p className="text-xs text-brand mt-1 group-hover:underline">Fazer upload →</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </GalleryLayout>
    );
  }

  let query = supabase
    .from("ext_product_images_summary")
    .select("product_code, total_images, high_count, low_count, thumb_url", { count: "exact" })
    .order("product_code");

  if (q?.trim()) {
    const search = q.trim().toLowerCase();
    // Search by name: get matching codprod from produto first
    const { data: nameMatches } = await supabase
      .from("produto")
      .select("codprod")
      .ilike("descrprod", `%${search}%`);
    const codesByName = (nameMatches ?? []).map((r) => String(r.codprod));
    if (codesByName.length > 0) {
      query = query.or(
        `product_code.ilike.%${search}%,product_code.in.(${codesByName.join(",")})`
      );
    } else {
      query = query.ilike("product_code", `%${search}%`);
    }
  }
  if (activeFilter === "apenas-high") query = query.gt("high_count", 0);
  if (activeFilter === "apenas-low") query = query.gt("low_count", 0);
  if (activeFilter === "recentes") {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    query = query.gte("last_upload", since);
  }

  const { data: products, count: totalCount } = await query.range(offset, offset + PAGE_SIZE - 1);

  // Fetch product names for the current page results
  const pageCodes = (products ?? []).map((r) => Number(r.product_code)).filter(Boolean);
  const { data: pageNames } = pageCodes.length > 0
    ? await supabase.from("produto").select("codprod, descrprod").in("codprod", pageCodes)
    : { data: [] as { codprod: number; descrprod: string | null }[] };
  const nameMap = Object.fromEntries(
    (pageNames ?? []).map((r) => [String(r.codprod), r.descrprod ?? null])
  );

  const totalPages = Math.ceil((totalCount ?? 0) / PAGE_SIZE);

  return (
    <GalleryLayout q={q} activeFilter={activeFilter} pageNum={pageNum} totalPages={totalPages}>
      {(products ?? []).length === 0 ? (
        <EmptyState q={q} filter={activeFilter} />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {(products ?? []).map((row) => {
            const thumbUrl = row.thumb_url as string | null;
            const hasHigh = (row.high_count as number) > 0;
            const hasLow = (row.low_count as number) > 0;
            return (
              <Link
                key={row.product_code}
                href={`/gallery/${encodeURIComponent(row.product_code)}`}
                className="group bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden hover:border-brand hover:shadow-md transition"
              >
                <div className="w-full h-36 bg-gray-100 dark:bg-gray-800 overflow-hidden">
                  {thumbUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumbUrl} alt={`Produto ${row.product_code}`} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-600">
                      <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">Cód: {row.product_code}</p>
                  {nameMap[row.product_code] && (
                    <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5 truncate">{nameMap[row.product_code]}</p>
                  )}
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{row.total_images as number} imagem(ns)</p>
                  <div className="flex gap-1 mt-1.5 flex-wrap">
                    {hasHigh && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">Alta</span>}
                    {hasLow && <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">Baixa</span>}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </GalleryLayout>
  );
}

function GalleryLayout({
  q,
  activeFilter,
  pageNum,
  totalPages,
  children,
}: {
  q?: string;
  activeFilter: FilterType;
  pageNum?: number;
  totalPages?: number;
  children: React.ReactNode;
}) {
  function pageHref(p: number) {
    const params = new URLSearchParams();
    if (q?.trim()) params.set("q", q.trim());
    if (activeFilter !== "todos") params.set("filter", activeFilter);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return `/gallery${qs ? `?${qs}` : ""}`;
  }

  function chipHref(value: FilterType) {
    const params = new URLSearchParams();
    if (q?.trim()) params.set("q", q.trim());
    if (value !== "todos") params.set("filter", value);
    const qs = params.toString();
    return `/gallery${qs ? `?${qs}` : ""}`;
  }

  const curPage = pageNum ?? 1;
  const maxPages = totalPages ?? 1;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header + search */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Galeria de produtos</h2>
        </div>
        <form method="GET" action="/gallery" className="flex gap-2">
          {activeFilter !== "todos" && <input type="hidden" name="filter" value={activeFilter} />}
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Buscar por código ou nome..."
            className="w-52 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand transition"
          />
          <button type="submit" className="bg-brand hover:bg-brand-dark text-white text-sm font-semibold px-4 py-2 rounded-lg transition">
            Buscar
          </button>
          {q && (
            <Link href={chipHref(activeFilter)} className="border border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500 text-gray-600 dark:text-gray-400 text-sm px-3 py-2 rounded-lg transition">
              Limpar
            </Link>
          )}
        </form>
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-2">
        {FILTER_CHIPS.map(({ value, label }) => {
          const active = activeFilter === value;
          return (
            <Link
              key={value}
              href={chipHref(value)}
              className={`text-xs font-medium px-3 py-1.5 rounded-full border transition ${
                active
                  ? "bg-brand text-white border-brand"
                  : "border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-brand hover:text-brand"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </div>

      {children}

      {/* Pagination */}
      {maxPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          {curPage > 1 ? (
            <Link href={pageHref(curPage - 1)} className="text-sm px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 hover:border-brand text-gray-600 dark:text-gray-400 transition">
              ← Anterior
            </Link>
          ) : (
            <span className="text-sm px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-800 text-gray-300 dark:text-gray-600 cursor-not-allowed">← Anterior</span>
          )}
          <span className="text-xs text-gray-500 dark:text-gray-400">Página {curPage} de {maxPages}</span>
          {curPage < maxPages ? (
            <Link href={pageHref(curPage + 1)} className="text-sm px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 hover:border-brand text-gray-600 dark:text-gray-400 transition">
              Próxima →
            </Link>
          ) : (
            <span className="text-sm px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-800 text-gray-300 dark:text-gray-600 cursor-not-allowed">Próxima →</span>
          )}
        </div>
      )}
    </div>
  );
}

function EmptyState({ q, filter }: { q?: string; filter: FilterType }) {
  let msg = "Nenhuma imagem cadastrada ainda.";
  if (q) msg = `Nenhum produto encontrado para "${q}".`;
  else if (filter === "sem-imagens") msg = "Todos os produtos já têm imagens!";
  else if (filter === "recentes") msg = "Nenhuma imagem nos últimos 7 dias.";
  else if (filter === "apenas-high") msg = "Nenhuma imagem high-res cadastrada.";
  else if (filter === "apenas-low") msg = "Nenhuma imagem low-res cadastrada.";

  return (
    <div className="bg-white dark:bg-gray-900 border border-dashed border-gray-300 dark:border-gray-700 rounded-xl py-16 text-center">
      <p className="text-sm text-gray-400 dark:text-gray-500">{msg}</p>
      <Link href="/upload" className="inline-block mt-3 text-sm text-brand hover:underline">
        Fazer upload
      </Link>
    </div>
  );
}

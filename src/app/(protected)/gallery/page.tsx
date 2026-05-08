import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type FilterType = "todos" | "apenas-high" | "apenas-low" | "recentes" | "sem-imagens";

interface Props {
  searchParams: Promise<{ q?: string; filter?: string }>;
}

const FILTER_CHIPS: { value: FilterType; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "apenas-high", label: "Apenas high-res" },
  { value: "apenas-low", label: "Apenas low-res" },
  { value: "recentes", label: "Recentes (7d)" },
  { value: "sem-imagens", label: "Sem imagens" },
];

export default async function GalleryPage({ searchParams }: Props) {
  const { q, filter } = await searchParams;
  const activeFilter = (filter as FilterType) || "todos";
  const supabase = await createClient();

  // "Sem imagens": fetch all codprod from produto, subtract those with images
  if (activeFilter === "sem-imagens") {
    const [{ data: allProducts }, { data: withImages }] = await Promise.all([
      supabase.from("produto").select("codprod"),
      supabase.from("ext_product_images").select("product_code").is("deleted_at", null),
    ]);
    const codesWithImages = new Set((withImages ?? []).map((r) => String(r.product_code)));
    let noImageProducts = (allProducts ?? [])
      .map((r) => String(r.codprod))
      .filter((c) => !codesWithImages.has(c));
    if (q?.trim()) {
      noImageProducts = noImageProducts.filter((c) => c.includes(q.trim()));
    }
    return (
      <GalleryLayout q={q} activeFilter={activeFilter}>
        {noImageProducts.length === 0 ? (
          <EmptyState q={q} filter={activeFilter} />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {noImageProducts.map((code) => (
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
    .from("ext_product_images")
    .select("product_code, resolution_type, public_url, position")
    .is("deleted_at", null)
    .order("product_code")
    .order("resolution_type")
    .order("position");

  if (q?.trim()) query = query.ilike("product_code", `%${q.trim()}%`);
  if (activeFilter === "apenas-high") query = query.eq("resolution_type", "high");
  if (activeFilter === "apenas-low") query = query.eq("resolution_type", "low");
  if (activeFilter === "recentes") {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    query = query.gte("created_at", since);
  }

  const { data: images } = await query;

  // Group by product_code
  const productMap = new Map<
    string,
    { thumbUrl: string | null; count: number; hasHigh: boolean; hasLow: boolean }
  >();

  for (const img of images ?? []) {
    const code = img.product_code;
    if (!productMap.has(code)) {
      productMap.set(code, { thumbUrl: img.public_url, count: 0, hasHigh: false, hasLow: false });
    }
    const entry = productMap.get(code)!;
    entry.count++;
    if (img.resolution_type === "high") entry.hasHigh = true;
    if (img.resolution_type === "low") {
      entry.hasLow = true;
      if (!entry.thumbUrl) entry.thumbUrl = img.public_url;
    }
  }

  const products = Array.from(productMap.entries());

  return (
    <GalleryLayout q={q} activeFilter={activeFilter}>
      {products.length === 0 ? (
        <EmptyState q={q} filter={activeFilter} />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {products.map(([code, { thumbUrl, count, hasHigh, hasLow }]) => (
            <Link
              key={code}
              href={`/gallery/${encodeURIComponent(code)}`}
              className="group bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden hover:border-brand hover:shadow-md transition"
            >
              <div className="w-full h-36 bg-gray-100 dark:bg-gray-800 overflow-hidden">
                {thumbUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={thumbUrl} alt={`Produto ${code}`} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-600">
                    <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="p-3">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">Cód: {code}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{count} imagem(ns)</p>
                <div className="flex gap-1 mt-1.5 flex-wrap">
                  {hasHigh && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">Alta</span>}
                  {hasLow && <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">Baixa</span>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </GalleryLayout>
  );
}

function GalleryLayout({
  q,
  activeFilter,
  children,
}: {
  q?: string;
  activeFilter: FilterType;
  children: React.ReactNode;
}) {
  function chipHref(value: FilterType) {
    const params = new URLSearchParams();
    if (q?.trim()) params.set("q", q.trim());
    if (value !== "todos") params.set("filter", value);
    const qs = params.toString();
    return `/gallery${qs ? `?${qs}` : ""}`;
  }

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
            placeholder="Buscar por código..."
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

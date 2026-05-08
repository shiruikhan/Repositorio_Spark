import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

interface Props {
  searchParams: Promise<{ q?: string }>;
}

export default async function GalleryPage({ searchParams }: Props) {
  const { q } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("ext_product_images")
    .select("product_code, resolution_type, public_url, position")
    .order("product_code")
    .order("resolution_type")
    .order("position");

  if (q?.trim()) {
    query = query.ilike("product_code", `%${q.trim()}%`);
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
      productMap.set(code, {
        thumbUrl: img.public_url,
        count: 0,
        hasHigh: false,
        hasLow: false,
      });
    }
    const entry = productMap.get(code)!;
    entry.count++;
    if (img.resolution_type === "high") entry.hasHigh = true;
    if (img.resolution_type === "low") {
      entry.hasLow = true;
      if (!entry.thumbUrl || entry.thumbUrl === null) {
        entry.thumbUrl = img.public_url;
      }
    }
  }

  const products = Array.from(productMap.entries());

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header + search */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Galeria de produtos</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {products.length > 0
              ? `${products.length} produto(s) com imagens cadastradas`
              : "Nenhuma imagem cadastrada ainda"}
          </p>
        </div>

        <form method="GET" action="/gallery" className="flex gap-2">
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Buscar por código..."
            className="w-52 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand transition"
          />
          <button
            type="submit"
            className="bg-brand hover:bg-brand-dark text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
          >
            Buscar
          </button>
          {q && (
            <Link
              href="/gallery"
              className="border border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500 text-gray-600 dark:text-gray-400 text-sm px-3 py-2 rounded-lg transition"
            >
              Limpar
            </Link>
          )}
        </form>
      </div>

      {/* Empty state */}
      {products.length === 0 && (
        <div className="bg-white dark:bg-gray-900 border border-dashed border-gray-300 dark:border-gray-700 rounded-xl py-16 text-center">
          <p className="text-sm text-gray-400 dark:text-gray-500">
            {q
              ? `Nenhum produto encontrado para "${q}".`
              : "Nenhuma imagem cadastrada ainda."}
          </p>
          <Link
            href="/upload"
            className="inline-block mt-3 text-sm text-brand hover:underline"
          >
            Fazer upload
          </Link>
        </div>
      )}

      {/* Product grid */}
      {products.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {products.map(([code, { thumbUrl, count, hasHigh, hasLow }]) => (
            <Link
              key={code}
              href={`/gallery/${encodeURIComponent(code)}`}
              className="group bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden hover:border-brand hover:shadow-md transition"
            >
              {/* Thumbnail */}
              <div className="w-full h-36 bg-gray-100 dark:bg-gray-800 overflow-hidden">
                {thumbUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={thumbUrl}
                    alt={`Produto ${code}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-600">
                    <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-3">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                  Cód: {code}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {count} imagem(ns)
                </p>
                <div className="flex gap-1 mt-1.5 flex-wrap">
                  {hasHigh && (
                    <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">
                      Alta
                    </span>
                  )}
                  {hasLow && (
                    <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">
                      Baixa
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

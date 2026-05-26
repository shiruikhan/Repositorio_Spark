import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ImageGrid from "./ImageGrid";

interface Props {
  params: Promise<{ productCode: string }>;
}

export default async function ProductDetailPage({ params }: Props) {
  const { productCode } = await params;
  const code = decodeURIComponent(productCode);
  const supabase = await createClient();

  const [{ data: images }, { data: productRow }] = await Promise.all([
    supabase
      .from("ext_product_images")
      .select("id, product_code, file_path, resolution_type, position, public_url, created_at, is_featured")
      .eq("product_code", code)
      .is("deleted_at", null)
      .order("resolution_type")
      .order("position"),
    supabase
      .from("produto")
      .select("descrprod")
      .eq("codprod", Number(code))
      .maybeSingle(),
  ]);

  const productName = (productRow as { descrprod: string | null } | null)?.descrprod ?? null;

  if (!images || images.length === 0) notFound();

  const highCount   = images.filter((i) => i.resolution_type === "high").length;
  const lowCount    = images.filter((i) => i.resolution_type === "low").length;
  const manualCount = images.filter((i) => i.resolution_type === "manual").length;
  const promoCount  = images.filter((i) => i.resolution_type === "promo").length;
  const videoCount  = images.filter((i) => i.resolution_type === "video").length;

  const manuals = images.filter((i) => i.resolution_type === "manual");
  const promos  = images.filter((i) => i.resolution_type === "promo");
  const videos  = images.filter((i) => i.resolution_type === "video");

  // ImageGrid recebe apenas high/low (suporta drag-and-drop e marcação de capa)
  const imagesOnly = images
    .filter((i) => i.resolution_type === "high" || i.resolution_type === "low")
    .map((i) => ({ ...i, is_featured: (i as { is_featured?: boolean }).is_featured ?? false }));

  const apiPreview = JSON.stringify(
    {
      product_code: code,
      total: imagesOnly.length,
      images: imagesOnly.map(({ id, resolution_type, position, public_url, created_at }) => ({
        id, resolution_type, position, public_url, created_at,
      })),
      manuals: manuals.map(({ id, public_url, created_at }) => ({ id, public_url, created_at })),
      promos:  promos.map(({ id, public_url, created_at })  => ({ id, public_url, created_at })),
      videos:  videos.map(({ id, public_url, created_at })  => ({ id, public_url, created_at })),
    },
    null,
    2
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <Link href="/gallery" className="hover:text-brand transition">
          Galeria
        </Link>
        <span>/</span>
        <span className="text-gray-900 dark:text-gray-100 font-medium">
          Cód: {code}{productName ? ` — ${productName}` : ""}
        </span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Produto {code}
          </h2>
          {productName && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{productName}</p>
          )}
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {highCount   > 0 && <span className="text-[11px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">Alta ({highCount})</span>}
            {lowCount    > 0 && <span className="text-[11px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">Baixa ({lowCount})</span>}
            {manualCount > 0 && <span className="text-[11px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-medium">Manual PDF ({manualCount})</span>}
            {promoCount  > 0 && <span className="text-[11px] bg-pink-100 text-pink-700 px-1.5 py-0.5 rounded font-medium">Promo ({promoCount})</span>}
            {videoCount  > 0 && <span className="text-[11px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-medium">Vídeo ({videoCount})</span>}
          </div>
        </div>
        <Link
          href="/upload"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-brand hover:bg-brand-dark px-4 py-2 rounded-lg transition shrink-0"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Adicionar imagens
        </Link>
      </div>

      {/* Manual PDF section */}
      {manuals.length > 0 && (
        <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800/40 rounded-xl px-4 py-3 space-y-2">
          <p className="text-xs font-semibold text-orange-700 dark:text-orange-400 uppercase tracking-wide">Manual do produto</p>
          {manuals.map((m) => (
            <div key={m.id} className="flex items-center gap-3">
              <svg className="w-5 h-5 text-orange-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              <span className="text-sm text-gray-700 dark:text-gray-300 truncate flex-1">
                {m.file_path.split("/").pop()}
              </span>
              {m.public_url && (
                <a
                  href={m.public_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="shrink-0 text-xs font-semibold text-orange-600 hover:text-orange-800 dark:text-orange-400 dark:hover:text-orange-200 border border-orange-300 dark:border-orange-700 px-2.5 py-1 rounded-lg transition"
                >
                  Download PDF
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Material Promocional */}
      {promos.length > 0 && (
        <div className="bg-pink-50 dark:bg-pink-950/20 border border-pink-200 dark:border-pink-800/40 rounded-xl px-4 py-3 space-y-2">
          <p className="text-xs font-semibold text-pink-700 dark:text-pink-400 uppercase tracking-wide">Material Promocional</p>
          {promos.map((item) => {
            const filename = item.file_path.split("/").pop() ?? item.file_path;
            const isPdf = filename.toLowerCase().endsWith(".pdf");
            return (
              <div key={item.id} className="flex items-center gap-3">
                {isPdf ? (
                  <svg className="w-5 h-5 text-pink-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-pink-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                  </svg>
                )}
                <span className="text-sm text-gray-700 dark:text-gray-300 truncate flex-1">{filename}</span>
                {item.public_url && (
                  <a href={item.public_url} target="_blank" rel="noopener noreferrer" download
                    className="shrink-0 text-xs font-semibold text-pink-600 hover:text-pink-800 dark:text-pink-400 dark:hover:text-pink-200 border border-pink-300 dark:border-pink-700 px-2.5 py-1 rounded-lg transition">
                    Download
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Vídeos */}
      {videos.length > 0 && (
        <div className="bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/40 rounded-xl px-4 py-3 space-y-3">
          <p className="text-xs font-semibold text-purple-700 dark:text-purple-400 uppercase tracking-wide">Vídeos do produto</p>
          {videos.map((item) => {
            const filename = item.file_path.split("/").pop() ?? item.file_path;
            return (
              <div key={item.id} className="space-y-2">
                {item.public_url && (
                  <video
                    controls
                    preload="metadata"
                    className="w-full max-h-72 rounded-lg bg-black"
                  >
                    <source src={item.public_url} />
                  </video>
                )}
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-700 dark:text-gray-300 truncate flex-1">{filename}</span>
                  {item.public_url && (
                    <a href={item.public_url} target="_blank" rel="noopener noreferrer" download
                      className="shrink-0 text-xs font-semibold text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-200 border border-purple-300 dark:border-purple-700 px-2.5 py-1 rounded-lg transition">
                      Download
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Image grid with delete + drag-and-drop */}
      <ImageGrid images={imagesOnly} productCode={code} />

      {/* API preview (Task 9) */}
      <details className="bg-gray-900 rounded-xl overflow-hidden">
        <summary className="cursor-pointer px-4 py-3 text-xs font-semibold text-gray-400 hover:text-gray-200 select-none">
          Prévia JSON da API — GET /api/products/{code}/images
        </summary>
        <pre className="px-4 pb-4 text-xs text-green-300 font-mono overflow-auto max-h-72">
          {apiPreview}
        </pre>
      </details>

      {/* API hint */}
      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 rounded-xl px-4 py-3 text-xs text-blue-700 dark:text-blue-400 space-y-1">
        <p className="font-semibold">Consulta via API (integrador)</p>
        <code className="block font-mono text-blue-800 dark:text-blue-300 break-all">
          {`GET ${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/ext_product_images?product_code=eq.${code}&select=*`}
        </code>
        <p className="text-blue-600 dark:text-blue-400 pt-0.5">
          Cabeçalho necessário:{" "}
          <code className="font-mono">apikey: &lt;ANON_KEY&gt;</code>
        </p>
      </div>
    </div>
  );
}

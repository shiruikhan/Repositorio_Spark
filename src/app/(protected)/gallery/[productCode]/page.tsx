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

  const { data: images } = await supabase
    .from("ext_product_images")
    .select("id, product_code, file_path, resolution_type, position, public_url, created_at")
    .eq("product_code", code)
    .is("deleted_at", null)
    .order("resolution_type")
    .order("position");

  if (!images || images.length === 0) notFound();

  const highCount = images.filter((i) => i.resolution_type === "high").length;
  const lowCount = images.filter((i) => i.resolution_type === "low").length;

  const apiPreview = JSON.stringify(
    {
      product_code: code,
      total: images.length,
      images: images.map(({ id, resolution_type, position, public_url, created_at }) => ({
        id,
        resolution_type,
        position,
        public_url,
        created_at,
      })),
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
        <span className="text-gray-900 dark:text-gray-100 font-medium">Cód: {code}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Produto {code}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {images.length} imagem(ns) —{" "}
            {highCount > 0 && `${highCount} alta res`}
            {highCount > 0 && lowCount > 0 && ", "}
            {lowCount > 0 && `${lowCount} baixa res`}
          </p>
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

      {/* Image grid with delete + drag-and-drop */}
      <ImageGrid images={images} productCode={code} />

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

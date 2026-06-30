import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const TYPE_CONFIG = [
  { key: "high",   label: "Alta resolução",  filter: "apenas-high",   badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",   border: "border-blue-200 dark:border-blue-800/40",  icon: "M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" },
  { key: "low",    label: "Baixa resolução", filter: "apenas-low",    badge: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",  border: "border-green-200 dark:border-green-800/40", icon: "M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" },
  { key: "manual", label: "Manuais PDF",     filter: "apenas-manual", badge: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400", border: "border-orange-200 dark:border-orange-800/40", icon: "M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" },
  { key: "promo",  label: "Material promo",  filter: "apenas-promo",  badge: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",    border: "border-pink-200 dark:border-pink-800/40",   icon: "M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.952 9.168-5v15c-1.543-3.048-5.068-5-9.168-5H7a3.988 3.988 0 01-1.564-.317z" },
  { key: "video",  label: "Vídeos",          filter: "apenas-video",  badge: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400", border: "border-purple-200 dark:border-purple-800/40", icon: "M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" },
] as const;

export default async function DashboardPage() {
  const supabase = await createClient();

  const [
    { count: totalImages },
    { count: totalProducts },
    { count: highCount },
    { count: lowCount },
    { count: manualCount },
    { count: promoCount },
    { count: videoCount },
    { data: recent },
  ] = await Promise.all([
    supabase.from("ext_product_images").select("*", { count: "exact", head: true }).is("deleted_at", null),
    supabase.from("ext_product_images_summary").select("*", { count: "exact", head: true }),
    supabase.from("ext_product_images").select("*", { count: "exact", head: true }).eq("resolution_type", "high").is("deleted_at", null),
    supabase.from("ext_product_images").select("*", { count: "exact", head: true }).eq("resolution_type", "low").is("deleted_at", null),
    supabase.from("ext_product_images").select("*", { count: "exact", head: true }).eq("resolution_type", "manual").is("deleted_at", null),
    supabase.from("ext_product_images").select("*", { count: "exact", head: true }).eq("resolution_type", "promo").is("deleted_at", null),
    supabase.from("ext_product_images").select("*", { count: "exact", head: true }).eq("resolution_type", "video").is("deleted_at", null),
    supabase.from("ext_product_images").select("id, product_code, resolution_type, public_url, created_at").is("deleted_at", null).order("created_at", { ascending: false }).limit(6),
  ]);

  const typeCounts: Record<string, number> = {
    high:   highCount   ?? 0,
    low:    lowCount    ?? 0,
    manual: manualCount ?? 0,
    promo:  promoCount  ?? 0,
    video:  videoCount  ?? 0,
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Visão geral</h2>

      {/* Totais */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <StatCard label="Total de arquivos" value={totalImages ?? 0} />
        <StatCard label="Produtos com imagem" value={totalProducts ?? 0} />
        <StatCard label="Bucket" value="product-assets" isText />
      </div>

      {/* Por tipo */}
      <div>
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Por tipo</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {TYPE_CONFIG.map(({ key, label, filter, badge, border, icon }) => (
            <Link
              key={key}
              href={`/gallery?filter=${filter}`}
              className={`group bg-white dark:bg-gray-900 border ${border} rounded-xl p-4 hover:shadow-md transition`}
            >
              <div className={`inline-flex items-center justify-center w-8 h-8 rounded-lg mb-3 ${badge}`}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
                </svg>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{typeCounts[key]}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{label}</p>
              <p className="text-[10px] text-brand mt-2 opacity-0 group-hover:opacity-100 transition">Ver galeria →</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Últimos uploads */}
      <div>
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
          Últimos uploads
        </h3>
        {!recent || recent.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 border border-dashed border-gray-300 dark:border-gray-700 rounded-xl py-12 text-center text-sm text-gray-400 dark:text-gray-500">
            Nenhuma imagem cadastrada ainda.{" "}
            <Link href="/upload" className="text-brand hover:underline">
              Fazer upload
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {recent.map((img) => (
              <Link
                key={img.id}
                href={`/gallery/${img.product_code}`}
                className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden hover:border-brand hover:shadow-md transition"
              >
                {img.public_url ? (
                  <div className="relative w-full h-32">
                    <Image
                      src={img.public_url}
                      alt={`Produto ${img.product_code}`}
                      fill
                      sizes="(max-width: 640px) 50vw, 33vw"
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-full h-32 bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 dark:text-gray-600 text-xs">
                    sem prévia
                  </div>
                )}
                <div className="p-2">
                  <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">
                    Cód: {img.product_code}
                  </p>
                  <span
                    className={`inline-block text-[10px] px-1.5 py-0.5 rounded mt-0.5 font-medium ${
                      img.resolution_type === "high"    ? "bg-blue-100 text-blue-700"
                      : img.resolution_type === "low"   ? "bg-green-100 text-green-700"
                      : img.resolution_type === "manual"? "bg-orange-100 text-orange-700"
                      : img.resolution_type === "promo" ? "bg-pink-100 text-pink-700"
                      : img.resolution_type === "video" ? "bg-purple-100 text-purple-700"
                      : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {img.resolution_type === "high"    ? "Alta res"
                     : img.resolution_type === "low"   ? "Baixa res"
                     : img.resolution_type === "manual"? "Manual PDF"
                     : img.resolution_type === "promo" ? "Promo"
                     : img.resolution_type === "video" ? "Vídeo"
                     : img.resolution_type}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="flex gap-3">
        <Link
          href="/upload"
          className="inline-flex items-center gap-2 bg-brand hover:bg-brand-dark text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          Upload de imagens
        </Link>
        <Link
          href="/gallery"
          className="inline-flex items-center gap-2 border border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-semibold px-4 py-2 rounded-lg transition"
        >
          Ver galeria
        </Link>
        <Link
          href="/gallery?filter=sem-imagens"
          className="inline-flex items-center gap-2 border border-gray-300 dark:border-gray-700 hover:border-brand hover:text-brand dark:hover:border-brand dark:hover:text-brand text-gray-700 dark:text-gray-300 text-sm font-semibold px-4 py-2 rounded-lg transition"
        >
          Sem imagens
        </Link>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  isText,
}: {
  label: string;
  value: number | string;
  isText?: boolean;
}) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
      <p
        className={`font-bold text-gray-900 dark:text-gray-100 ${isText ? "text-sm" : "text-2xl"}`}
      >
        {value}
      </p>
    </div>
  );
}

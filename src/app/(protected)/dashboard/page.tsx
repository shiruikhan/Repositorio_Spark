import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();

  const { count: totalImages } = await supabase
    .from("ext_product_images")
    .select("*", { count: "exact", head: true })
    .is("deleted_at", null);

  // Conta produtos distintos usando a view que agrupa por product_code
  const { count: totalProducts } = await supabase
    .from("ext_product_images_summary")
    .select("*", { count: "exact", head: true });

  const { data: recent } = await supabase
    .from("ext_product_images")
    .select("id, product_code, resolution_type, public_url, created_at")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(6);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Visão geral</h2>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <StatCard label="Total de imagens" value={totalImages ?? 0} />
        <StatCard label="Produtos com imagem" value={totalProducts ?? 0} />
        <StatCard label="Bucket" value="product-assets" isText />
      </div>

      {/* Recent uploads */}
      <div>
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
          Últimos uploads
        </h3>
        {!recent || recent.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 border border-dashed border-gray-300 dark:border-gray-700 rounded-xl py-12 text-center text-sm text-gray-400 dark:text-gray-500">
            Nenhuma imagem cadastrada ainda.{" "}
            <a href="/upload" className="text-brand hover:underline">
              Fazer upload
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {recent.map((img) => (
              <div
                key={img.id}
                className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden"
              >
                {img.public_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={img.public_url}
                    alt={img.product_code}
                    className="w-full h-32 object-cover"
                  />
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
                      img.resolution_type === "high"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-green-100 text-green-700"
                    }`}
                  >
                    {img.resolution_type === "high" ? "Alta res" : "Baixa res"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="flex gap-3">
        <a
          href="/upload"
          className="inline-flex items-center gap-2 bg-brand hover:bg-brand-dark text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          Upload de imagens
        </a>
        <a
          href="/gallery"
          className="inline-flex items-center gap-2 border border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-semibold px-4 py-2 rounded-lg transition"
        >
          Ver galeria
        </a>
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

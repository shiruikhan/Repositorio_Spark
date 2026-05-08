import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CopyButton from "@/components/CopyButton";
import DownloadButton from "@/components/DownloadButton";

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
    .order("resolution_type")
    .order("position");

  if (!images || images.length === 0) notFound();

  const highRes = images.filter((i) => i.resolution_type === "high");
  const lowRes = images.filter((i) => i.resolution_type === "low");

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
            {highRes.length > 0 && `${highRes.length} alta res`}
            {highRes.length > 0 && lowRes.length > 0 && ", "}
            {lowRes.length > 0 && `${lowRes.length} baixa res`}
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

      {/* Section: Alta resolução */}
      {highRes.length > 0 && (
        <Section title="Alta resolução" badge="blue">
          {highRes.map((img) => (
            <ImageCard key={img.id} img={img} />
          ))}
        </Section>
      )}

      {/* Section: Baixa resolução */}
      {lowRes.length > 0 && (
        <Section title="Baixa resolução" badge="green">
          {lowRes.map((img) => (
            <ImageCard key={img.id} img={img} />
          ))}
        </Section>
      )}

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

function Section({
  title,
  badge,
  children,
}: {
  title: string;
  badge: "blue" | "green";
  children: React.ReactNode;
}) {
  const color =
    badge === "blue"
      ? "bg-blue-100 text-blue-700"
      : "bg-green-100 text-green-700";

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className={`text-xs font-semibold px-2 py-0.5 rounded ${color}`}>
          {title}
        </span>
        <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {children}
      </div>
    </div>
  );
}

function ImageCard({
  img,
}: {
  img: {
    id: number;
    file_path: string;
    resolution_type: string;
    position: number;
    public_url: string | null;
    created_at: string | null;
  };
}) {
  const filename = img.file_path.split("/").pop() ?? img.file_path;
  const url = img.public_url ?? "";
  const date = img.created_at
    ? new Date(img.created_at).toLocaleDateString("pt-BR")
    : "";

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      {/* Preview */}
      <div className="w-full h-44 bg-gray-100 dark:bg-gray-800 overflow-hidden">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={filename}
            className="w-full h-full object-contain p-2"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-600 text-xs">
            sem prévia
          </div>
        )}
      </div>

      {/* Info + actions */}
      <div className="p-3 space-y-2">
        <div>
          <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate" title={filename}>
            {filename}
          </p>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
            Posição {img.position} · {date}
          </p>
        </div>

        {url && (
          <div className="flex gap-2 flex-wrap">
            <CopyButton url={url} />
            {img.resolution_type === "high" && (
              <DownloadButton url={url} filename={filename} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

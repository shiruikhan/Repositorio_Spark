import { createClient } from "@supabase/supabase-js";
import PublicGallery from "./PublicGallery";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Repositório de Imagens — Spark Eletrônica",
  description:
    "Banco oficial de imagens de produtos da Spark Eletrônica para integradores e parceiros comerciais.",
};

const LOGO_URL =
  "https://obbymrwivuhjopwnmoxx.supabase.co/storage/v1/object/public/product-assets/brand/spark_logo.png";

export type ProductSummary = {
  product_code: string;
  total_images: number;
  high_count: number;
  low_count: number;
  thumb_url: string | null;
};

export default async function PublicPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: products } = await supabase
    .from("ext_product_images_summary")
    .select("product_code, total_images, high_count, low_count, thumb_url")
    .order("product_code");

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
      {/* Header */}
      <header className="bg-black text-white sticky top-0 z-20 border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <a
            href="https://usinaspark.com.br"
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={LOGO_URL}
              alt="Spark Eletrônica"
              className="h-8 w-auto object-contain brightness-0 invert"
            />
          </a>
          <span className="hidden sm:block text-xs text-gray-400 flex-1">
            Repositório de Imagens
          </span>
          <a
            href="/login"
            className="shrink-0 text-xs font-semibold border border-gray-600 hover:border-brand hover:text-brand px-3 py-1.5 rounded-lg transition"
          >
            Acessar painel →
          </a>
        </div>
      </header>

      {/* Hero */}
      <div className="bg-black text-white py-10 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">
            Repositório de Imagens
          </h1>
          <p className="text-gray-400 text-sm max-w-xl leading-relaxed">
            Banco oficial de imagens de produtos da Spark Eletrônica para
            integradores e parceiros comerciais. Faça o download em alta ou
            baixa resolução.
          </p>
        </div>
      </div>

      {/* Gallery */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-8">
        <PublicGallery products={products ?? []} />
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800 py-6 px-4 text-center text-xs text-gray-400 dark:text-gray-600">
        <a
          href="https://usinaspark.com.br"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-brand transition"
        >
          usinaspark.com.br
        </a>
        {" · "}© {new Date().getFullYear()} Spark Eletrônica. Todos os direitos reservados.
      </footer>
    </div>
  );
}

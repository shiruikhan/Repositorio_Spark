import { createClient } from "@supabase/supabase-js";
import Image from "next/image";
import PublicGallery from "./PublicGallery";
import type { Metadata } from "next";

export const revalidate = 300; // ISR: re-render in background every 5 min

export const metadata: Metadata = {
  title: "Repositorio de Imagens - Spark Eletronica",
  description: "Banco oficial de imagens de produtos da Spark Eletronica para integradores e parceiros comerciais.",
};

const LOGO_URL =
  "https://obbymrwivuhjopwnmoxx.supabase.co/storage/v1/object/public/product-assets/brand/spark_logo.png";

export type ProductSummary = {
  product_code: string;
  total_images: number;
  high_count: number;
  low_count: number;
  manual_count: number;
  thumb_url: string | null;
};

export default async function PublicPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: products } = await supabase
    .from("ext_product_images_summary")
    .select("product_code, total_images, high_count, low_count, manual_count, thumb_url")
    .order("product_code");

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

        {/* Header - fundo branco, logo em cores naturais */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
            <a
              href="https://usinaspark.com.br"
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0"
            >
              <Image
                src={LOGO_URL}
                alt="Spark Eletronica"
                width={160}
                height={32}
                className="h-8 w-auto object-contain"
                priority
              />
            </a>
            <span className="hidden sm:block text-xs text-gray-400 flex-1">
              Repositorio de Imagens
            </span>
            <a
              href="/login"
              className="shrink-0 text-xs font-semibold border border-gray-300 hover:border-brand hover:text-brand text-gray-600 px-3 py-1.5 rounded-lg transition"
            >
              Acessar painel
            </a>
          </div>
        </header>

        {/* Hero - fundo vermelho da marca */}
        <div className="bg-brand text-white py-10 px-4 sm:px-6">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">
              Repositorio de Imagens
            </h1>
            <p className="text-red-100 text-sm max-w-xl leading-relaxed">
              Banco oficial de imagens de produtos da Spark Eletronica para
              integradores e parceiros comerciais. Faca o download em alta ou
              baixa resolucao.
            </p>
          </div>
        </div>

        {/* Gallery */}
        <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-8">
          <PublicGallery products={products ?? []} />
        </main>

        {/* Footer */}
        <footer className="border-t border-gray-200 py-6 px-4 text-center text-xs text-gray-400">
          <a
            href="https://usinaspark.com.br"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-brand transition"
          >
            usinaspark.com.br
          </a>
          {" - "}
          {new Date().getFullYear()} Spark Eletronica. Todos os direitos reservados.
        </footer>

    </div>
  );
}

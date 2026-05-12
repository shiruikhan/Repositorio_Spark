"use client";

import { useState, useMemo } from "react";
import type { ProductSummary } from "./page";

type ImageItem = {
  id: string;
  resolution_type: string;
  position: number;
  public_url: string | null;
  created_at: string | null;
};

export default function PublicGallery({ products }: { products: ProductSummary[] }) {
  const [search, setSearch] = useState("");
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [modalImages, setModalImages] = useState<ImageItem[]>([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [downloadingZip, setDownloadingZip] = useState(false);

  const filtered = useMemo(
    () =>
      search.trim()
        ? products.filter((p) =>
            p.product_code.toLowerCase().includes(search.trim().toLowerCase())
          )
        : products,
    [products, search]
  );

  async function openModal(code: string) {
    setSelectedCode(code);
    setModalImages([]);
    setModalLoading(true);
    try {
      const res = await fetch(`/api/products/${encodeURIComponent(code)}/images`);
      const json = await res.json();
      setModalImages(json.images ?? []);
    } catch {
      setModalImages([]);
    } finally {
      setModalLoading(false);
    }
  }

  function closeModal() {
    setSelectedCode(null);
    setModalImages([]);
  }

  async function downloadZip(code: string) {
    setDownloadingZip(true);
    try {
      const res = await fetch(`/api/products/${encodeURIComponent(code)}/zip`);
      if (!res.ok) throw new Error("Erro no servidor");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `spark_${code}_imagens.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Erro ao gerar o ZIP. Tente novamente.");
    } finally {
      setDownloadingZip(false);
    }
  }

  const highRes = modalImages.filter((i) => i.resolution_type === "high");
  const lowRes = modalImages.filter((i) => i.resolution_type === "low");

  return (
    <>
      {/* Search bar */}
      <div className="mb-6 flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 104.65 4.65a7.5 7.5 0 0012 12z"
            />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por código de produto..."
            className="w-full pl-9 pr-8 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-brand focus:ring-1 focus:ring-brand outline-none transition"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg leading-none"
            >
              ×
            </button>
          )}
        </div>
        <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">
          {filtered.length} produto{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Product grid */}
      {filtered.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-sm text-gray-400 dark:text-gray-500">
            {search
              ? `Nenhum produto encontrado para "${search}".`
              : "Nenhuma imagem disponível no momento."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filtered.map((p) => (
            <button
              key={p.product_code}
              onClick={() => openModal(p.product_code)}
              className="group text-left bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden hover:border-brand hover:shadow-md transition"
            >
              {/* Thumbnail */}
              <div className="w-full h-36 bg-gray-100 dark:bg-gray-800 overflow-hidden">
                {p.thumb_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.thumb_url}
                    alt={`Produto ${p.product_code}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-600">
                    <svg
                      className="w-10 h-10"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                )}
              </div>

              {/* Card info */}
              <div className="p-3">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                  Cód: {p.product_code}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {p.total_images} imagem{p.total_images !== 1 ? "ns" : ""}
                </p>
                <div className="flex gap-1 mt-1.5 flex-wrap">
                  {p.high_count > 0 && (
                    <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">
                      Alta ({p.high_count})
                    </span>
                  )}
                  {p.low_count > 0 && (
                    <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">
                      Baixa ({p.low_count})
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Modal */}
      {selectedCode && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={closeModal}
        >
          <div
            className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
              <div>
                <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
                  Produto {selectedCode}
                </h2>
                {!modalLoading && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {modalImages.length} imagem{modalImages.length !== 1 ? "ns" : ""}{" "}
                    {highRes.length > 0 && `· ${highRes.length} alta res`}
                    {lowRes.length > 0 && ` · ${lowRes.length} baixa res`}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => downloadZip(selectedCode)}
                  disabled={downloadingZip || modalLoading || modalImages.length === 0}
                  className="inline-flex items-center gap-1.5 bg-brand hover:bg-brand-dark disabled:opacity-50 text-white text-xs font-semibold px-3 py-2 rounded-lg transition"
                >
                  {downloadingZip ? (
                    <>
                      <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Gerando...
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                        />
                      </svg>
                      Baixar ZIP
                    </>
                  )}
                </button>
                <button
                  onClick={closeModal}
                  className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal body */}
            <div className="overflow-y-auto flex-1 p-5 space-y-6">
              {modalLoading ? (
                <div className="flex items-center justify-center py-16">
                  <svg className="w-6 h-6 animate-spin text-brand" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                </div>
              ) : (
                <>
                  {highRes.length > 0 && (
                    <ImageSection title="Alta resolução" badge="blue" images={highRes} />
                  )}
                  {lowRes.length > 0 && (
                    <ImageSection title="Baixa resolução" badge="green" images={lowRes} />
                  )}
                  {modalImages.length === 0 && (
                    <p className="text-sm text-gray-400 text-center py-12">
                      Nenhuma imagem disponível.
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ImageSection({
  title,
  badge,
  images,
}: {
  title: string;
  badge: "blue" | "green";
  images: ImageItem[];
}) {
  const color =
    badge === "blue" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700";

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className={`text-xs font-semibold px-2 py-0.5 rounded ${color}`}>{title}</span>
        <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {images.map((img) => (
          <ImageCard key={img.id} img={img} />
        ))}
      </div>
    </div>
  );
}

function ImageCard({ img }: { img: ImageItem }) {
  const [copied, setCopied] = useState(false);
  const url = img.public_url ?? "";
  const filename = url.split("/").pop()?.split("?")[0] ?? `${img.id}.jpg`;

  function copy() {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      {/* Preview */}
      <div className="w-full h-32 bg-gray-100 dark:bg-gray-700 overflow-hidden">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={filename}
            className="w-full h-full object-contain p-1"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-600 text-xs">
            sem prévia
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-2 py-2 flex items-center gap-1">
        <p
          className="text-[10px] text-gray-500 dark:text-gray-400 truncate flex-1"
          title={filename}
        >
          {filename}
        </p>
        {url && (
          <button
            onClick={copy}
            title="Copiar link público"
            className="shrink-0 text-[10px] font-medium text-brand hover:text-brand-dark transition whitespace-nowrap"
          >
            {copied ? "Copiado!" : "Copiar link"}
          </button>
        )}
      </div>
    </div>
  );
}

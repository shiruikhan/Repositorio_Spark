"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import type { ProductSummary } from "./page";

type FileItem = {
  id: string;
  resolution_type: string;
  position: number;
  public_url: string | null;
  created_at: string | null;
};

function isPdf(url: string) {
  return url.toLowerCase().split("?")[0].endsWith(".pdf");
}

function getFilename(url: string) {
  return url.split("/").pop()?.split("?")[0] ?? url;
}

export default function PublicGallery({ products }: { products: ProductSummary[] }) {
  const [search, setSearch] = useState("");
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [modalImages, setModalImages]   = useState<FileItem[]>([]);
  const [modalManuals, setModalManuals] = useState<FileItem[]>([]);
  const [modalPromos, setModalPromos]   = useState<FileItem[]>([]);
  const [modalVideos, setModalVideos]   = useState<FileItem[]>([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [downloadingZip, setDownloadingZip] = useState(false);

  const filtered = useMemo(
    () =>
      search.trim()
        ? products.filter((p) => {
            const s = search.trim().toLowerCase();
            return (
              p.product_code.toLowerCase().includes(s) ||
              (p.product_name ? p.product_name.toLowerCase().includes(s) : false)
            );
          })
        : products,
    [products, search]
  );

  async function openModal(product: ProductSummary) {
    setSelectedCode(product.product_code);
    setSelectedName(product.product_name ?? null);
    setModalImages([]);
    setModalManuals([]);
    setModalPromos([]);
    setModalVideos([]);
    setModalLoading(true);
    try {
      const res = await fetch(`/api/products/${encodeURIComponent(product.product_code)}/images`);
      const json = await res.json();
      setModalImages(json.images  ?? []);
      setModalManuals(json.manuals ?? []);
      setModalPromos(json.promos  ?? []);
      setModalVideos(json.videos  ?? []);
    } catch {
      setModalImages([]);
      setModalManuals([]);
      setModalPromos([]);
      setModalVideos([]);
    } finally {
      setModalLoading(false);
    }
  }

  function closeModal() {
    setSelectedCode(null);
    setSelectedName(null);
    setModalImages([]);
    setModalManuals([]);
    setModalPromos([]);
    setModalVideos([]);
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
      a.download = `spark_${code}_arquivos.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Erro ao gerar o ZIP. Tente novamente.");
    } finally {
      setDownloadingZip(false);
    }
  }

  const highRes = modalImages.filter((i) => i.resolution_type === "high");
  const lowRes  = modalImages.filter((i) => i.resolution_type === "low");
  const totalModal = modalImages.length + modalManuals.length + modalPromos.length + modalVideos.length;

  return (
    <>
      {/* Search bar */}
      <div className="mb-6 flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 104.65 4.65a7.5 7.5 0 0012 12z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por codigo ou nome do produto..."
            className="w-full pl-9 pr-8 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-brand focus:ring-1 focus:ring-brand outline-none transition"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg leading-none">
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
            {search ? `Nenhum produto encontrado para "${search}".` : "Nenhuma imagem disponivel no momento."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((p) => (
            <button
              key={p.product_code}
              onClick={() => openModal(p)}
              className="group text-left bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden hover:border-brand hover:shadow-md transition"
            >
              {/* Thumbnail */}
              <div className="relative w-full h-40 bg-gray-100 dark:bg-gray-800 overflow-hidden shrink-0">
                {p.thumb_url ? (
                  <Image
                    src={p.thumb_url}
                    alt={`Produto ${p.product_code}`}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    className="object-cover group-hover:scale-105 transition duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-600">
                    <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Card info */}
              <div className="p-3 flex flex-col gap-2">
                <div>
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                    Cód: {p.product_code}
                  </p>
                  {p.product_name && (
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-0.5 leading-snug break-words">
                      {p.product_name}
                    </p>
                  )}
                </div>
                <div className="flex gap-1 flex-wrap">
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
                  {p.manual_count > 0 && (
                    <span className="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-medium flex items-center gap-0.5">
                      <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Manual
                    </span>
                  )}
                  {p.promo_count > 0 && (
                    <span className="text-[10px] bg-pink-100 text-pink-700 px-1.5 py-0.5 rounded font-medium flex items-center gap-0.5">
                      <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                      </svg>
                      Promo ({p.promo_count})
                    </span>
                  )}
                  {p.video_count > 0 && (
                    <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-medium flex items-center gap-0.5">
                      <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                      </svg>
                      Video ({p.video_count})
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={closeModal}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>

            {/* Modal header */}
            <div className="flex items-start justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0 gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-400 dark:text-gray-500">Cód: {selectedCode}</p>
                {selectedName && (
                  <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 mt-0.5 leading-snug break-words">
                    {selectedName}
                  </h2>
                )}
                {!modalLoading && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {highRes.length > 0        && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">{highRes.length} alta res</span>}
                    {lowRes.length > 0         && <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">{lowRes.length} baixa res</span>}
                    {modalManuals.length > 0   && <span className="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-medium">Manual PDF</span>}
                    {modalPromos.length > 0    && <span className="text-[10px] bg-pink-100 text-pink-700 px-1.5 py-0.5 rounded font-medium">{modalPromos.length} promo</span>}
                    {modalVideos.length > 0    && <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-medium">{modalVideos.length} vídeo(s)</span>}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => downloadZip(selectedCode)}
                  disabled={downloadingZip || modalLoading || totalModal === 0}
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
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Baixar ZIP
                    </>
                  )}
                </button>
                <button onClick={closeModal} className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
                  {/* Manual PDF */}
                  {modalManuals.length > 0 && (
                    <FileListSection
                      title="Manual do produto"
                      badgeClass="bg-orange-100 text-orange-700"
                      items={modalManuals}
                      productCode={selectedCode}
                    />
                  )}

                  {/* Material Promocional */}
                  {modalPromos.length > 0 && (
                    <PromoSection items={modalPromos} productCode={selectedCode} />
                  )}

                  {/* Vídeos */}
                  {modalVideos.length > 0 && (
                    <FileListSection
                      title="Vídeos do produto"
                      badgeClass="bg-purple-100 text-purple-700"
                      items={modalVideos}
                      productCode={selectedCode}
                      icon="video"
                    />
                  )}

                  {/* Imagens alta res */}
                  {highRes.length > 0 && (
                    <ImageSection title="Alta resolucao" badge="blue" images={highRes} />
                  )}

                  {/* Imagens baixa res */}
                  {lowRes.length > 0 && (
                    <ImageSection title="Baixa resolucao" badge="green" images={lowRes} />
                  )}

                  {totalModal === 0 && (
                    <p className="text-sm text-gray-400 text-center py-12">
                      Nenhum arquivo disponivel.
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

/* ─── Seção de arquivos para download (manuais / vídeos) ─── */
function FileListSection({
  title,
  badgeClass,
  items,
  productCode,
  icon = "pdf",
}: {
  title: string;
  badgeClass: string;
  items: FileItem[];
  productCode: string;
  icon?: "pdf" | "video";
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className={`text-xs font-semibold px-2 py-0.5 rounded ${badgeClass}`}>{title}</span>
        <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
      </div>
      <div className="space-y-2">
        {items.map((item) => {
          const url = item.public_url ?? "";
          const filename = getFilename(url) || `${productCode}_${item.id}`;
          return (
            <div key={item.id} className={`flex items-center gap-3 rounded-xl px-4 py-3 border ${icon === "video" ? "bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800/40" : "bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800/40"}`}>
              {icon === "video" ? (
                <svg className="w-6 h-6 text-purple-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-orange-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              )}
              <span className="text-sm text-gray-700 dark:text-gray-300 flex-1 break-all">{filename}</span>
              {url && (
                <a href={url} target="_blank" rel="noopener noreferrer" download
                  className={`shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold border px-3 py-1.5 rounded-lg transition ${icon === "video" ? "text-purple-600 hover:text-purple-800 border-purple-300 hover:border-purple-500" : "text-orange-600 hover:text-orange-800 border-orange-300 hover:border-orange-500"}`}>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download
                </a>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Seção de Material Promocional (imagens + PDFs mistos) ─── */
function PromoSection({ items, productCode }: { items: FileItem[]; productCode: string }) {
  const imageItems = items.filter((i) => i.public_url && !isPdf(i.public_url));
  const pdfItems   = items.filter((i) => i.public_url && isPdf(i.public_url));

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-pink-100 text-pink-700">Material Promocional</span>
        <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
      </div>

      {/* Imagens promo em grid */}
      {imageItems.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {imageItems.map((item) => {
            const url = item.public_url ?? "";
            const filename = getFilename(url);
            return (
              <div key={item.id} className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                <div className="relative w-full h-28 bg-gray-100 dark:bg-gray-700">
                  <Image src={url} alt={filename} fill sizes="(max-width: 640px) 50vw, 33vw" className="object-contain p-1" />
                </div>
                <div className="px-2 py-2 flex items-center gap-1">
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate flex-1" title={filename}>{filename}</p>
                  <a href={url} target="_blank" rel="noopener noreferrer" download
                    className="shrink-0 text-[10px] font-medium text-pink-600 hover:text-pink-800 transition whitespace-nowrap">
                    Download
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* PDFs promo em lista */}
      {pdfItems.length > 0 && (
        <div className="space-y-2">
          {pdfItems.map((item) => {
            const url = item.public_url ?? "";
            const filename = getFilename(url) || `promo_${productCode}`;
            return (
              <div key={item.id} className="flex items-center gap-3 bg-pink-50 dark:bg-pink-950/20 border border-pink-200 dark:border-pink-800/40 rounded-xl px-4 py-3">
                <svg className="w-6 h-6 text-pink-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                <span className="text-sm text-gray-700 dark:text-gray-300 flex-1 break-all">{filename}</span>
                <a href={url} target="_blank" rel="noopener noreferrer" download
                  className="shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold text-pink-600 hover:text-pink-800 border border-pink-300 hover:border-pink-500 px-3 py-1.5 rounded-lg transition">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download
                </a>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Seção de imagens (alta/baixa res) ─── */
function ImageSection({ title, badge, images }: { title: string; badge: "blue" | "green"; images: FileItem[] }) {
  const color = badge === "blue" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700";
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

function ImageCard({ img }: { img: FileItem }) {
  const [copied, setCopied] = useState(false);
  const url = img.public_url ?? "";
  const filename = getFilename(url) || `${img.id}.jpg`;

  function copy() {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      <div className="relative w-full h-32 bg-gray-100 dark:bg-gray-700 overflow-hidden">
        {url ? (
          <Image src={url} alt={filename} fill sizes="(max-width: 640px) 50vw, 33vw" className="object-contain p-1" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-600 text-xs">sem previa</div>
        )}
      </div>
      <div className="px-2 py-2 flex items-center gap-1">
        <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate flex-1" title={filename}>{filename}</p>
        {url && (
          <button onClick={copy} title="Copiar link publico" className="shrink-0 text-[10px] font-medium text-brand hover:text-brand-dark transition whitespace-nowrap">
            {copied ? "Copiado!" : "Copiar link"}
          </button>
        )}
      </div>
    </div>
  );
}

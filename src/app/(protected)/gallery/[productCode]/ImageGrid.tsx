"use client";

import { useState, useRef, useTransition } from "react";
import CopyButton from "@/components/CopyButton";
import DownloadButton from "@/components/DownloadButton";
import { deleteImage, reorderImages, setFeaturedImage } from "@/app/actions/images";

export type ImageRow = {
  id: string;
  file_path: string;
  resolution_type: string;
  position: number;
  public_url: string | null;
  created_at: string | null;
  is_featured: boolean;
};

export default function ImageGrid({
  images,
  productCode,
}: {
  images: ImageRow[];
  productCode: string;
}) {
  const [highRes, setHighRes] = useState(images.filter((i) => i.resolution_type === "high"));
  const [lowRes,  setLowRes]  = useState(images.filter((i) => i.resolution_type === "low"));

  // ID da imagem atualmente marcada como capa (compartilhado entre seções)
  const [featuredId, setFeaturedId] = useState<string | null>(
    images.find((i) => i.is_featured)?.id ?? null
  );

  function handleToggleFeatured(img: ImageRow) {
    const willBeFeatured = featuredId !== img.id;

    // Atualização otimista: reflete imediatamente na UI
    setFeaturedId(willBeFeatured ? img.id : null);

    // Persiste no banco (fire-and-forget com rollback em erro)
    setFeaturedImage(img.id, productCode, willBeFeatured).then((res) => {
      if (!res.ok) {
        // Reverte estado em caso de erro
        setFeaturedId(img.is_featured ? img.id : null);
        alert(res.message ?? "Erro ao definir capa.");
      }
    });
  }

  return (
    <div className="space-y-6">
      {highRes.length > 0 && (
        <Section
          title="Alta resolução"
          badge="blue"
          items={highRes}
          setItems={setHighRes}
          productCode={productCode}
          featuredId={featuredId}
          onToggleFeatured={handleToggleFeatured}
        />
      )}
      {lowRes.length > 0 && (
        <Section
          title="Baixa resolução"
          badge="green"
          items={lowRes}
          setItems={setLowRes}
          productCode={productCode}
          featuredId={featuredId}
          onToggleFeatured={handleToggleFeatured}
        />
      )}
    </div>
  );
}

function Section({
  title,
  badge,
  items,
  setItems,
  productCode,
  featuredId,
  onToggleFeatured,
}: {
  title: string;
  badge: "blue" | "green";
  items: ImageRow[];
  setItems: React.Dispatch<React.SetStateAction<ImageRow[]>>;
  productCode: string;
  featuredId: string | null;
  onToggleFeatured: (img: ImageRow) => void;
}) {
  const color = badge === "blue" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700";
  const dragIndex = useRef<number | null>(null);

  function handleDragStart(i: number) {
    dragIndex.current = i;
  }

  function handleDrop(i: number) {
    const from = dragIndex.current;
    if (from === null || from === i) return;
    const reordered = [...items];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(i, 0, moved);
    const withPositions = reordered.map((img, idx) => ({ ...img, position: idx }));
    setItems(withPositions);
    dragIndex.current = null;
    reorderImages(
      withPositions.map(({ id, position }) => ({ id, position })),
      productCode
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className={`text-xs font-semibold px-2 py-0.5 rounded ${color}`}>{title}</span>
        <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((img, i) => (
          <ImageCard
            key={img.id}
            img={img}
            productCode={productCode}
            isFeatured={featuredId === img.id}
            onToggleFeatured={() => onToggleFeatured(img)}
            onDelete={(id) => setItems((prev) => prev.filter((x) => x.id !== id))}
            draggable
            onDragStart={() => handleDragStart(i)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(i)}
          />
        ))}
      </div>
    </div>
  );
}

function ImageCard({
  img,
  productCode,
  isFeatured,
  onToggleFeatured,
  onDelete,
  draggable,
  onDragStart,
  onDragOver,
  onDrop,
}: {
  img: ImageRow;
  productCode: string;
  isFeatured: boolean;
  onToggleFeatured: () => void;
  onDelete: (id: string) => void;
  draggable: boolean;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [showConfirm, setShowConfirm] = useState(false);
  const filename = img.file_path.split("/").pop() ?? img.file_path;
  const url = img.public_url ?? "";
  const date = img.created_at ? new Date(img.created_at).toLocaleDateString("pt-BR") : "";

  function handleDelete() {
    startTransition(async () => {
      const res = await deleteImage(img.id, img.file_path, productCode);
      if (res.ok) onDelete(img.id);
      else alert(res.message);
    });
  }

  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={`bg-white dark:bg-gray-900 border rounded-xl overflow-hidden cursor-grab active:cursor-grabbing transition ${
        isFeatured
          ? "border-yellow-400 ring-2 ring-yellow-300/50 dark:ring-yellow-500/30"
          : "border-gray-200 dark:border-gray-700"
      } ${isPending ? "opacity-50 pointer-events-none" : ""}`}
    >
      {/* Grip indicator + position */}
      <div className="flex items-center justify-between px-3 pt-2">
        <svg className="w-4 h-4 text-gray-300 dark:text-gray-600" fill="currentColor" viewBox="0 0 20 20">
          <path d="M7 2a2 2 0 110 4 2 2 0 010-4zm6 0a2 2 0 110 4 2 2 0 010-4zM7 8a2 2 0 110 4 2 2 0 010-4zm6 0a2 2 0 110 4 2 2 0 010-4zM7 14a2 2 0 110 4 2 2 0 010-4zm6 0a2 2 0 110 4 2 2 0 010-4z" />
        </svg>
        <span className="text-[10px] text-gray-400">pos {img.position}</span>
      </div>

      {/* Preview + star overlay */}
      <div className="relative w-full h-40 bg-gray-100 dark:bg-gray-800 overflow-hidden group/img">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={filename} className="w-full h-full object-contain p-2" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-600 text-xs">
            sem prévia
          </div>
        )}

        {/* Botão capa — sempre visível se ativo, aparece no hover se inativo */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onToggleFeatured(); }}
          title={isFeatured ? "Remover como capa" : "Definir como capa"}
          className={`absolute top-2 right-2 p-1.5 rounded-full transition cursor-pointer ${
            isFeatured
              ? "bg-yellow-400 text-white shadow-md opacity-100"
              : "bg-black/40 text-white opacity-0 group-hover/img:opacity-100 hover:bg-yellow-400"
          }`}
        >
          {isFeatured ? (
            /* Estrela preenchida */
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
            </svg>
          ) : (
            /* Estrela vazia */
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
            </svg>
          )}
        </button>

        {/* Badge "Capa" visível na imagem */}
        {isFeatured && (
          <span className="absolute bottom-2 left-2 text-[10px] font-bold bg-yellow-400 text-yellow-900 px-1.5 py-0.5 rounded shadow-sm">
            CAPA
          </span>
        )}
      </div>

      {/* Info + actions */}
      <div className="p-3 space-y-2">
        <div>
          <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate" title={filename}>
            {filename}
          </p>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{date}</p>
        </div>

        <div className="flex gap-2 flex-wrap items-center">
          {url && <CopyButton url={url} />}
          {url && img.resolution_type === "high" && (
            <DownloadButton url={url} filename={filename} />
          )}
          <button
            onClick={() => setShowConfirm(true)}
            disabled={isPending}
            title="Excluir imagem"
            className="ml-auto p-1.5 rounded border border-gray-200 dark:border-gray-700 text-gray-400 hover:text-red-600 hover:border-red-400 transition disabled:opacity-40"
          >
            {isPending ? (
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 dark:bg-red-950/40 rounded-full flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Excluir imagem?</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 break-all">{filename}</p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="text-sm px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-400 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => { setShowConfirm(false); handleDelete(); }}
                className="text-sm px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white font-semibold transition"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

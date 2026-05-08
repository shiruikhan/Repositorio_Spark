"use client";

import { useState, useRef, useTransition } from "react";
import CopyButton from "@/components/CopyButton";
import DownloadButton from "@/components/DownloadButton";
import { deleteImage, reorderImages } from "@/app/actions/images";

export type ImageRow = {
  id: string;
  file_path: string;
  resolution_type: string;
  position: number;
  public_url: string | null;
  created_at: string | null;
};

export default function ImageGrid({
  images,
  productCode,
}: {
  images: ImageRow[];
  productCode: string;
}) {
  const [highRes, setHighRes] = useState(images.filter((i) => i.resolution_type === "high"));
  const [lowRes, setLowRes] = useState(images.filter((i) => i.resolution_type === "low"));

  return (
    <div className="space-y-6">
      {highRes.length > 0 && (
        <Section
          title="Alta resolução"
          badge="blue"
          items={highRes}
          setItems={setHighRes}
          productCode={productCode}
        />
      )}
      {lowRes.length > 0 && (
        <Section
          title="Baixa resolução"
          badge="green"
          items={lowRes}
          setItems={setLowRes}
          productCode={productCode}
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
}: {
  title: string;
  badge: "blue" | "green";
  items: ImageRow[];
  setItems: React.Dispatch<React.SetStateAction<ImageRow[]>>;
  productCode: string;
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
  onDelete,
  draggable,
  onDragStart,
  onDragOver,
  onDrop,
}: {
  img: ImageRow;
  productCode: string;
  onDelete: (id: string) => void;
  draggable: boolean;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const filename = img.file_path.split("/").pop() ?? img.file_path;
  const url = img.public_url ?? "";
  const date = img.created_at ? new Date(img.created_at).toLocaleDateString("pt-BR") : "";

  function handleDelete() {
    if (!window.confirm(`Excluir "${filename}"? Esta ação não pode ser desfeita.`)) return;
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
      className={`bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden cursor-grab active:cursor-grabbing transition ${isPending ? "opacity-50 pointer-events-none" : ""}`}
    >
      {/* Grip indicator */}
      <div className="flex items-center justify-between px-3 pt-2">
        <svg className="w-4 h-4 text-gray-300 dark:text-gray-600" fill="currentColor" viewBox="0 0 20 20">
          <path d="M7 2a2 2 0 110 4 2 2 0 010-4zm6 0a2 2 0 110 4 2 2 0 010-4zM7 8a2 2 0 110 4 2 2 0 010-4zm6 0a2 2 0 110 4 2 2 0 010-4zM7 14a2 2 0 110 4 2 2 0 010-4zm6 0a2 2 0 110 4 2 2 0 010-4z" />
        </svg>
        <span className="text-[10px] text-gray-400">pos {img.position}</span>
      </div>

      {/* Preview */}
      <div className="w-full h-40 bg-gray-100 dark:bg-gray-800 overflow-hidden">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={filename} className="w-full h-full object-contain p-2" />
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
          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{date}</p>
        </div>

        <div className="flex gap-2 flex-wrap items-center">
          {url && <CopyButton url={url} />}
          {url && img.resolution_type === "high" && (
            <DownloadButton url={url} filename={filename} />
          )}
          <button
            onClick={handleDelete}
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
    </div>
  );
}

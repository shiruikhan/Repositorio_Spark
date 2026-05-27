"use client";

import type { ResolutionType } from "@/lib/naming";

interface Props {
  resolutionType: ResolutionType | "";
  dragging: boolean;
  onDragOver: () => void;
  onDragLeave: () => void;
  onDrop: (files: FileList) => void;
  onFileChange: (files: FileList | null) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}

export default function FileDropzone({
  resolutionType,
  dragging,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileChange,
  fileInputRef,
}: Props) {
  const isManual = resolutionType === "manual";
  const isVideo  = resolutionType === "promo" ? false : resolutionType === "video";
  const isPromo  = resolutionType === "promo";

  const label =
    isManual ? "Manual PDF"
    : isVideo  ? "Vídeo"
    : isPromo  ? "Material Promocional"
    : "Imagens";

  const hint =
    isManual ? "PDF — até 50 MB"
    : isVideo  ? "MP4, WEBM, MOV — até 250 MB"
    : isPromo  ? "JPG, PNG, WEBP, PDF — até 50 MB cada"
    : "JPG, PNG, WEBP — até 50 MB cada";

  const dragText =
    isManual ? "o PDF"
    : isVideo  ? "o vídeo"
    : isPromo  ? "os arquivos"
    : "imagens";

  const accept =
    isManual ? "application/pdf,.pdf"
    : isVideo  ? "video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
    : isPromo  ? "image/*,application/pdf,.pdf"
    : "image/*";

  const iconPath =
    isVideo
      ? "M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z"
      : (isManual || isPromo)
      ? "M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
      : "M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5";

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label} <span className="text-brand">*</span>
      </label>
      <div
        onDragOver={(e) => { e.preventDefault(); onDragOver(); }}
        onDragLeave={onDragLeave}
        onDrop={(e) => { e.preventDefault(); onDrop(e.dataTransfer.files); }}
        onClick={() => fileInputRef.current?.click()}
        className={
          "cursor-pointer border-2 border-dashed rounded-xl py-10 flex flex-col items-center justify-center gap-2 transition " +
          (dragging
            ? "border-brand bg-red-50 dark:bg-red-950/20"
            : "border-gray-300 dark:border-gray-700 hover:border-brand hover:bg-gray-50 dark:hover:bg-gray-800/50")
        }
      >
        <svg
          className={"w-8 h-8 " + (dragging ? "text-brand" : "text-gray-400 dark:text-gray-500")}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d={iconPath} />
        </svg>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Arraste {dragText} aqui ou{" "}
          <span className="text-brand font-medium">clique para selecionar</span>
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500">{hint}</p>
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={!isManual && !isVideo}
          className="hidden"
          onChange={(e) => onFileChange(e.target.files)}
        />
      </div>
    </div>
  );
}

"use client";

import type { ResolutionType } from "@/lib/naming";

interface Props {
  files: File[];
  previews: string[];
  resolutionType: ResolutionType | "";
  pending: boolean;
  fileProgress: Map<number, number>;
  onRemove: (index: number) => void;
}

export default function FilePreviewGrid({
  files,
  previews,
  resolutionType,
  pending,
  fileProgress,
  onRemove,
}: Props) {
  if (files.length === 0) return null;

  const isManual = resolutionType === "manual";
  const isVideo  = resolutionType === "video";
  const isPromo  = resolutionType === "promo";
  const isSingle = isManual || isVideo;

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500 dark:text-gray-400">
        {files.length} arquivo(s) selecionado(s)
      </p>

      {/* Single file: manual PDF ou vídeo */}
      {isSingle ? (
        <div
          className={`flex items-center gap-3 border rounded-xl px-4 py-3 ${
            isVideo
              ? "bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800/40"
              : "bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800/40"
          }`}
        >
          {isVideo ? (
            <svg className="w-8 h-8 text-purple-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
            </svg>
          ) : (
            <svg className="w-8 h-8 text-orange-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{files[0].name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {(files[0].size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
          <button
            type="button"
            onClick={() => onRemove(0)}
            className="text-xs text-red-500 hover:text-red-700 font-medium shrink-0"
          >
            Remover
          </button>
        </div>
      ) : (
        /* Grid: imagens e promo */
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {files.map((file, i) => (
            <div key={i} className="relative group">
              {previews[i] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previews[i]}
                  alt={file.name}
                  className="w-full h-20 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                />
              ) : (
                <div className="w-full h-20 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800/40 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                </div>
              )}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onRemove(i); }}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
              >
                ×
              </button>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate mt-0.5">{file.name}</p>
            </div>
          ))}
        </div>
      )}

      {/* Barra de progresso por arquivo */}
      {pending && fileProgress.size > 0 && (
        <div className="space-y-2 pt-1">
          {files.map((file, i) => {
            const pct = fileProgress.get(i) ?? 0;
            return (
              <div key={i}>
                <div className="flex justify-between text-xs text-gray-500 mb-0.5">
                  <span className="truncate max-w-[70%]">{file.name}</span>
                  <span>{pct < 0 ? "erro" : `${pct}%`}</span>
                </div>
                <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={"h-full transition-all rounded-full " + (pct < 0 ? "bg-red-500" : "bg-brand")}
                    style={{ width: `${Math.max(0, pct)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Aviso para promo: PDF não tem preview */}
      {isPromo && files.some((f) => f.type === "application/pdf") && (
        <p className="text-xs text-gray-400 dark:text-gray-500">
          PDFs não têm miniatura — serão enviados normalmente.
        </p>
      )}
    </div>
  );
}

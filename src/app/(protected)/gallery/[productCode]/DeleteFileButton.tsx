"use client";

import { useState, useTransition } from "react";
import { deleteImage } from "@/app/actions/images";

interface Props {
  id: string;
  filePath: string;
  productCode: string;
  label: string;
}

/**
 * Botão de exclusão para arquivos que não passam pelo ImageGrid
 * (manual PDF, material promocional e vídeo). Reutiliza `deleteImage`,
 * que faz soft delete e move o arquivo para `trash/`. A revalidação do
 * path na própria Server Action atualiza a lista após a exclusão.
 */
export default function DeleteFileButton({ id, filePath, productCode, label }: Props) {
  const [isPending, startTransition] = useTransition();
  const [showConfirm, setShowConfirm] = useState(false);
  const filename = filePath.split("/").pop() ?? filePath;

  function handleDelete() {
    startTransition(async () => {
      const res = await deleteImage(id, filePath, productCode);
      if (!res.ok) alert(res.message);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowConfirm(true)}
        disabled={isPending}
        title={`Excluir ${label}`}
        aria-label={`Excluir ${label}`}
        className="shrink-0 p-1.5 rounded border border-gray-200 dark:border-gray-700 text-gray-400 hover:text-red-600 hover:border-red-400 transition disabled:opacity-40"
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
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Excluir {label}?</h3>
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
    </>
  );
}

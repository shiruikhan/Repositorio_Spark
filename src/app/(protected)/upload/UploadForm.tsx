"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { uploadImages, type UploadState } from "@/app/actions/upload";

export default function UploadForm() {
  const [state, formAction, pending] = useActionState<
    UploadState | undefined,
    FormData
  >(uploadImages, undefined);

  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok && (state.results?.length ?? 0) > 0) {
      setFiles([]);
      setPreviews([]);
      formRef.current?.reset();
    }
  }, [state]);

  function addFiles(incoming: FileList | null) {
    if (!incoming) return;
    const valid = Array.from(incoming).filter((f) =>
      f.type.startsWith("image/")
    );
    setFiles((prev) => {
      const merged = [...prev, ...valid];
      setPreviews(merged.map((f) => URL.createObjectURL(f)));
      return merged;
    });
  }

  function removeFile(index: number) {
    setFiles((prev) => {
      const next = prev.filter((_, i) => i !== index);
      setPreviews(next.map((f) => URL.createObjectURL(f)));
      return next;
    });
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.delete("files");
    files.forEach((f) => fd.append("files", f));
    formAction(fd);
  }

  return (
    <div className="space-y-6">
      <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
        {/* Product code + resolution */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Código do produto <span className="text-brand">*</span>
            </label>
            <input
              name="product_code"
              type="text"
              required
              placeholder="Ex: 1234"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-600 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Resolução <span className="text-brand">*</span>
            </label>
            <select
              name="resolution_type"
              required
              defaultValue=""
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand transition"
            >
              <option value="" disabled>
                Selecione...
              </option>
              <option value="high">Alta resolução</option>
              <option value="low">Baixa resolução</option>
            </select>
          </div>
        </div>

        {/* Drop zone */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Imagens <span className="text-brand">*</span>
          </label>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              addFiles(e.dataTransfer.files);
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer border-2 border-dashed rounded-xl py-10 flex flex-col items-center justify-center gap-2 transition ${
              dragging
                ? "border-brand bg-red-50 dark:bg-red-950/20"
                : "border-gray-300 dark:border-gray-700 hover:border-brand hover:bg-gray-50 dark:hover:bg-gray-800/50"
            }`}
          >
            <svg
              className={`w-8 h-8 ${dragging ? "text-brand" : "text-gray-400 dark:text-gray-500"}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
              />
            </svg>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Arraste imagens aqui ou{" "}
              <span className="text-brand font-medium">clique para selecionar</span>
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">JPG, PNG, WEBP — até 50 MB cada</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => addFiles(e.target.files)}
            />
          </div>
        </div>

        {/* Preview grid */}
        {files.length > 0 && (
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              {files.length} arquivo(s) selecionado(s)
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {files.map((file, i) => (
                <div key={i} className="relative group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previews[i]}
                    alt={file.name}
                    className="w-full h-20 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(i);
                    }}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                  >
                    ×
                  </button>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate mt-0.5">
                    {file.name}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Global error */}
        {state && !state.ok && state.message && !state.results?.length && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {state.message}
          </p>
        )}

        <button
          type="submit"
          disabled={pending || files.length === 0}
          className="inline-flex items-center gap-2 bg-brand hover:bg-brand-dark disabled:opacity-50 text-white font-semibold text-sm px-6 py-2.5 rounded-lg transition"
        >
          {pending ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Enviando...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Enviar {files.length > 0 ? `${files.length} imagem(ns)` : "imagens"}
            </>
          )}
        </button>
      </form>

      {/* Success result */}
      {state?.results && state.results.length > 0 && (
        <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900/50 rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold text-green-800 dark:text-green-400">
            {state.message}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {state.results.map((img) => (
              <div
                key={img.filePath}
                className="flex items-center gap-2 bg-white dark:bg-gray-900 border border-green-100 dark:border-green-900/50 rounded-lg px-3 py-2"
              >
                <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-xs text-gray-700 dark:text-gray-300 truncate flex-1">
                  {img.fileName}
                </span>
                <CopyButton url={img.publicUrl} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Partial errors */}
      {state?.errors && state.errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-1">
          <p className="text-sm font-semibold text-red-800 mb-2">
            Falha em {state.errors.length} arquivo(s):
          </p>
          {state.errors.map((err, i) => (
            <p key={i} className="text-xs text-red-700">
              <span className="font-medium">{err.fileName}</span> — {err.message}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

function CopyButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <button
      type="button"
      onClick={copy}
      title="Copiar link público"
      className="shrink-0 text-xs text-brand hover:text-brand-dark font-medium transition"
    >
      {copied ? "Copiado!" : "Copiar link"}
    </button>
  );
}

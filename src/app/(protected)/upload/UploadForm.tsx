"use client";

import CopyButton from "@/components/CopyButton";
import { useUploadForm } from "./useUploadForm";
import FileDropzone from "./FileDropzone";
import FilePreviewGrid from "./FilePreviewGrid";
import type { ResolutionType } from "@/lib/naming";

export default function UploadForm() {
  const {
    state, pending, files, previews, dragging, fileProgress, dimensionErrors,
    resolutionType, productName, productNameLoading, suggestions,
    fileInputRef, productCodeRef,
    isManual, isVideo, isPromo, submitLabel,
    setDragging, handleProductCodeChange, handleProductCodeBlur,
    addFiles, removeFile, handleResolutionChange, handleSubmit,
  } = useUploadForm();

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Código do produto + Tipo */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Codigo do produto <span className="text-brand">*</span>
            </label>
            <input
              ref={productCodeRef}
              name="product_code"
              type="text"
              required
              placeholder="Ex: 1234"
              list="product-suggestions"
              onChange={handleProductCodeChange}
              onBlur={handleProductCodeBlur}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-600 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand transition"
            />
            <datalist id="product-suggestions">
              {suggestions.map((s) => (
                <option key={s.codprod} value={String(s.codprod)}>{s.descrprod}</option>
              ))}
            </datalist>
            {productNameLoading && (
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">Buscando produto...</p>
            )}
            {!productNameLoading && productName === "not_found" && (
              <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                Produto não encontrado no catálogo — o upload ainda pode ser feito.
              </p>
            )}
            {!productNameLoading && productName && productName !== "not_found" && (
              <p className="mt-1 text-xs text-green-700 dark:text-green-400 font-medium truncate">
                {productName}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Tipo <span className="text-brand">*</span>
            </label>
            <select
              name="resolution_type"
              required
              value={resolutionType}
              onChange={(e) => handleResolutionChange(e.target.value as ResolutionType | "")}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand transition"
            >
              <option value="" disabled>Selecione...</option>
              <option value="high">Alta resolucao</option>
              <option value="low">Baixa resolucao</option>
              <option value="manual">Manual do produto (PDF)</option>
              <option value="promo">Material Promocional</option>
              <option value="video">Video do produto</option>
            </select>
          </div>
        </div>

        {/* Drop zone */}
        <FileDropzone
          resolutionType={resolutionType}
          dragging={dragging}
          onDragOver={() => setDragging(true)}
          onDragLeave={() => setDragging(false)}
          onDrop={(fl) => void addFiles(fl)}
          onFileChange={(fl) => void addFiles(fl)}
          fileInputRef={fileInputRef}
        />

        {/* Previews + progresso */}
        <FilePreviewGrid
          files={files}
          previews={previews}
          resolutionType={resolutionType}
          pending={pending}
          fileProgress={fileProgress}
          onRemove={removeFile}
        />

        {/* Imagens rejeitadas por dimensão */}
        {dimensionErrors.length > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 space-y-0.5">
            <p className="text-xs font-semibold text-orange-700 mb-1">Imagens rejeitadas (abaixo do minimo):</p>
            {dimensionErrors.map((msg, i) => (
              <p key={i} className="text-xs text-orange-700">{msg}</p>
            ))}
          </div>
        )}

        {/* Erro global de validação */}
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
              {submitLabel}
            </>
          )}
        </button>
      </form>

      {/* Resultado de sucesso */}
      {state?.results && state.results.length > 0 && (
        <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900/50 rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold text-green-800 dark:text-green-400">{state.message}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {state.results.map((img) => (
              <div
                key={img.filePath}
                className="flex items-center gap-2 bg-white dark:bg-gray-900 border border-green-100 dark:border-green-900/50 rounded-lg px-3 py-2"
              >
                <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-xs text-gray-700 dark:text-gray-300 truncate flex-1">{img.fileName}</span>
                <CopyButton url={img.publicUrl} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Erros parciais */}
      {state?.errors && state.errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-1">
          <p className="text-sm font-semibold text-red-800 mb-2">Falha em {state.errors.length} arquivo(s):</p>
          {state.errors.map((err, i) => (
            <p key={i} className="text-xs text-red-700">
              <span className="font-medium">{err.fileName}</span>{" - "}{err.message}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

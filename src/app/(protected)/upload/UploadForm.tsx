"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { buildFilePath, type ResolutionType } from "@/lib/naming";
import { saveImageRecord, getNextPosition } from "@/app/actions/upload";
import type { UploadedImage, UploadError, UploadState } from "@/app/actions/upload";

const MIN_DIM = 300;
const MAX_LOW_WIDTH = 800;

function checkDimensions(file: File): Promise<{ ok: boolean; width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ ok: img.naturalWidth >= MIN_DIM && img.naturalHeight >= MIN_DIM, width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve({ ok: false, width: 0, height: 0 }); };
    img.src = url;
  });
}

async function processImage(file: File, resolutionType: ResolutionType): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const isLow = resolutionType === "low";
      const needsResize = isLow && img.naturalWidth > MAX_LOW_WIDTH;
      const scale = needsResize ? MAX_LOW_WIDTH / img.naturalWidth : 1;
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.naturalWidth * scale);
      canvas.height = Math.round(img.naturalHeight * scale);
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const quality = isLow ? 0.88 : 0.95;
      const baseName = file.name.replace(/\.[^.]+$/, "");
      canvas.toBlob(
        (blob) => resolve(blob ? new File([blob], baseName + ".jpg", { type: "image/jpeg" }) : file),
        "image/jpeg",
        quality
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

export default function UploadForm() {
  const [state, setState] = useState<UploadState | undefined>(undefined);
  const [pending, setPending] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);
  const [fileProgress, setFileProgress] = useState<Map<number, number>>(new Map());
  const [dimensionErrors, setDimensionErrors] = useState<string[]>([]);
  const [resolutionType, setResolutionType] = useState<ResolutionType | "">("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const productCodeRef = useRef<HTMLInputElement>(null);

  const isManual = resolutionType === "manual";

  async function addFiles(incoming: FileList | null) {
    if (!incoming) return;

    if (isManual) {
      // PDF only — sem verificacao de dimensoes
      const pdfs = Array.from(incoming).filter((f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"));
      if (pdfs.length === 0) return;
      // Para manual: apenas 1 arquivo
      const single = pdfs.slice(0, 1);
      setFiles(single);
      setPreviews([]);
      setDimensionErrors([]);
      return;
    }

    const candidates = Array.from(incoming).filter((f) => f.type.startsWith("image/"));
    const rejected: string[] = [];
    const valid: File[] = [];

    await Promise.all(
      candidates.map(async (f) => {
        const { ok, width, height } = await checkDimensions(f);
        if (ok) {
          valid.push(f);
        } else {
          rejected.push(f.name + " (" + width + "x" + height + "px - min. " + MIN_DIM + "x" + MIN_DIM + "px)");
        }
      })
    );

    setDimensionErrors(rejected);
    if (valid.length === 0) return;

    setFiles((prev) => {
      const merged = [...prev, ...valid];
      setPreviews(merged.map((f) => URL.createObjectURL(f)));
      return merged;
    });
  }

  function removeFile(index: number) {
    setFiles((prev) => {
      const next = prev.filter((_, i) => i !== index);
      if (!isManual) setPreviews(next.map((f) => URL.createObjectURL(f)));
      return next;
    });
  }

  function handleResolutionChange(val: ResolutionType | "") {
    setResolutionType(val);
    setFiles([]);
    setPreviews([]);
    setDimensionErrors([]);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const productCode = productCodeRef.current?.value.trim() ?? "";

    if (!productCode) { setState({ ok: false, message: "Informe o codigo do produto." }); return; }
    if (!resolutionType) { setState({ ok: false, message: "Selecione o tipo." }); return; }
    if (files.length === 0) {
      setState({ ok: false, message: isManual ? "Selecione um arquivo PDF." : "Selecione ao menos uma imagem." });
      return;
    }

    setPending(true);
    setState(undefined);
    setFileProgress(new Map());

    const supabase = createClient();
    const timestamp = Date.now();
    const startPosition = await getNextPosition(productCode, resolutionType);

    const results: UploadedImage[] = [];
    const errors: UploadError[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const position = startPosition + i;
      setFileProgress((prev) => new Map(prev).set(i, 0));

      // PDFs nao passam pelo processamento de canvas
      const fileToUpload = isManual ? file : await processImage(file, resolutionType);
      const filePath = buildFilePath(productCode, resolutionType, timestamp, position, fileToUpload.name);

      const { error: storageError } = await supabase.storage
        .from("product-assets")
        .upload(filePath, fileToUpload, {
          upsert: false,
          contentType: fileToUpload.type,
          // @ts-expect-error - onUploadProgress is supported by Supabase JS v2
          onUploadProgress: (evt: { loaded: number; total: number }) => {
            const pct = Math.round((evt.loaded / evt.total) * 100);
            setFileProgress((prev) => new Map(prev).set(i, pct));
          },
        });

      if (storageError) {
        errors.push({ fileName: file.name, message: storageError.message });
        setFileProgress((prev) => new Map(prev).set(i, -1));
        continue;
      }

      setFileProgress((prev) => new Map(prev).set(i, 100));

      const { data: { publicUrl } } = supabase.storage
        .from("product-assets")
        .getPublicUrl(filePath);

      const saved = await saveImageRecord({ productCode, resolutionType, filePath, publicUrl, position });

      if (!saved.ok) {
        errors.push({ fileName: file.name, message: saved.message ?? "Erro ao salvar no banco." });
        continue;
      }

      results.push({ fileName: file.name, filePath, publicUrl });
    }

    setFileProgress(new Map());
    setPending(false);

    if (results.length > 0) {
      setFiles([]);
      setPreviews([]);
    }

    setState({
      ok: errors.length === 0,
      productCode,
      results,
      errors,
      message:
        results.length > 0
          ? results.length + (isManual ? " manual(is) enviado(s) com sucesso." : " imagem(ns) enviada(s) com sucesso.")
          : "Nenhum arquivo foi enviado.",
    });
  }

  const submitLabel = files.length > 0
    ? (isManual ? "Enviar manual PDF" : "Enviar " + files.length + " imagem(ns)")
    : "Enviar";

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Product code + type */}
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
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-600 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand transition"
            />
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
            </select>
          </div>
        </div>

        {/* Drop zone — muda conforme o tipo selecionado */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {isManual ? "Manual PDF" : "Imagens"} <span className="text-brand">*</span>
          </label>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); void addFiles(e.dataTransfer.files); }}
            onClick={() => fileInputRef.current?.click()}
            className={"cursor-pointer border-2 border-dashed rounded-xl py-10 flex flex-col items-center justify-center gap-2 transition " + (
              dragging
                ? "border-brand bg-red-50 dark:bg-red-950/20"
                : "border-gray-300 dark:border-gray-700 hover:border-brand hover:bg-gray-50 dark:hover:bg-gray-800/50"
            )}
          >
            {isManual ? (
              <svg className={"w-8 h-8 " + (dragging ? "text-brand" : "text-gray-400 dark:text-gray-500")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            ) : (
              <svg className={"w-8 h-8 " + (dragging ? "text-brand" : "text-gray-400 dark:text-gray-500")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
            )}
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Arraste {isManual ? "o PDF" : "imagens"} aqui ou{" "}
              <span className="text-brand font-medium">clique para selecionar</span>
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {isManual ? "PDF - ate 50 MB" : "JPG, PNG, WEBP - ate 50 MB cada"}
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept={isManual ? "application/pdf,.pdf" : "image/*"}
              multiple={!isManual}
              className="hidden"
              onChange={(e) => void addFiles(e.target.files)}
            />
          </div>
        </div>

        {/* Preview: PDF mostra nome; imagens mostram thumb */}
        {files.length > 0 && (
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              {files.length} arquivo(s) selecionado(s)
            </p>
            {isManual ? (
              <div className="flex items-center gap-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800/40 rounded-xl px-4 py-3">
                <svg className="w-8 h-8 text-orange-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{files[0].name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{(files[0].size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <button
                  type="button"
                  onClick={() => removeFile(0)}
                  className="text-xs text-red-500 hover:text-red-700 font-medium shrink-0"
                >
                  Remover
                </button>
              </div>
            ) : (
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
                      onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                    >
                      x
                    </button>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate mt-0.5">{file.name}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Dimension errors */}
        {dimensionErrors.length > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 space-y-0.5">
            <p className="text-xs font-semibold text-orange-700 mb-1">Imagens rejeitadas (abaixo do minimo):</p>
            {dimensionErrors.map((msg, i) => (
              <p key={i} className="text-xs text-orange-700">{msg}</p>
            ))}
          </div>
        )}

        {/* Per-file progress */}
        {pending && fileProgress.size > 0 && (
          <div className="space-y-2">
            {files.map((file, i) => {
              const pct = fileProgress.get(i) ?? 0;
              return (
                <div key={i}>
                  <div className="flex justify-between text-xs text-gray-500 mb-0.5">
                    <span className="truncate max-w-[70%]">{file.name}</span>
                    <span>{pct < 0 ? "erro" : (pct + "%")}</span>
                  </div>
                  <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={"h-full transition-all rounded-full " + (pct < 0 ? "bg-red-500" : "bg-brand")}
                      style={{ width: Math.max(0, pct) + "%" }}
                    />
                  </div>
                </div>
              );
            })}
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
              {submitLabel}
            </>
          )}
        </button>
      </form>

      {/* Success result */}
      {state?.results && state.results.length > 0 && (
        <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900/50 rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold text-green-800 dark:text-green-400">{state.message}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {state.results.map((img) => (
              <div key={img.filePath} className="flex items-center gap-2 bg-white dark:bg-gray-900 border border-green-100 dark:border-green-900/50 rounded-lg px-3 py-2">
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

      {/* Partial errors */}
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

function CopyButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <button type="button" onClick={copy} title="Copiar link publico"
      className="shrink-0 text-xs text-brand hover:text-brand-dark font-medium transition">
      {copied ? "Copiado!" : "Copiar link"}
    </button>
  );
}

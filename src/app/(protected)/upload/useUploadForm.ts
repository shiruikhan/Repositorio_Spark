"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { buildFilePath, type ResolutionType } from "@/lib/naming";
import { saveImageRecord, getNextPosition } from "@/app/actions/upload";
import type { UploadedImage, UploadError, UploadState } from "@/app/actions/upload";
import {
  MIN_DIM,
  MAX_VIDEO_BYTES,
  isVideoFile,
  isPdfFile,
  checkDimensions,
  processImage,
} from "./uploadUtils";

export interface UseUploadFormReturn {
  // estado
  state: UploadState | undefined;
  pending: boolean;
  files: File[];
  previews: string[];
  dragging: boolean;
  fileProgress: Map<number, number>;
  dimensionErrors: string[];
  resolutionType: ResolutionType | "";
  productName: string | null | "not_found";
  productNameLoading: boolean;
  suggestions: Array<{ codprod: number; descrprod: string }>;
  // refs
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  productCodeRef: React.RefObject<HTMLInputElement | null>;
  // derivados
  isManual: boolean;
  isPromo: boolean;
  isVideo: boolean;
  isImageOnly: boolean;
  submitLabel: string;
  // handlers
  setDragging: (v: boolean) => void;
  handleProductCodeChange: () => void;
  handleProductCodeBlur: () => Promise<void>;
  addFiles: (incoming: FileList | null) => Promise<void>;
  removeFile: (index: number) => void;
  handleResolutionChange: (val: ResolutionType | "") => void;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
}

export function useUploadForm(): UseUploadFormReturn {
  const [state, setState] = useState<UploadState | undefined>(undefined);
  const [pending, setPending] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);
  const [fileProgress, setFileProgress] = useState<Map<number, number>>(new Map());
  const [dimensionErrors, setDimensionErrors] = useState<string[]>([]);
  const [resolutionType, setResolutionType] = useState<ResolutionType | "">("");
  const [productName, setProductName] = useState<string | null | "not_found">(null);
  const [productNameLoading, setProductNameLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Array<{ codprod: number; descrprod: string }>>([]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const productCodeRef = useRef<HTMLInputElement | null>(null);
  const suggestTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isManual    = resolutionType === "manual";
  const isPromo     = resolutionType === "promo";
  const isVideo     = resolutionType === "video";
  const isImageOnly = resolutionType === "high" || resolutionType === "low";

  const submitLabel =
    files.length > 0
      ? isManual ? "Enviar manual PDF"
        : isVideo  ? "Enviar vídeo"
        : isPromo  ? `Enviar ${files.length} arquivo(s) promo`
        : `Enviar ${files.length} imagem(ns)`
      : "Enviar";

  // ── Autocomplete ──────────────────────────────────────────────────────────

  async function fetchSuggestions(value: string) {
    const trimmed = value.trim();
    if (trimmed.length < 2) { setSuggestions([]); return; }
    const supabase = createClient();
    const isNumeric = /^\d+$/.test(trimmed);
    const query = supabase.from("produto").select("codprod,descrprod").limit(8);
    if (isNumeric) {
      void query.filter("codprod::text", "ilike", `${trimmed}%`).then(({ data }) => setSuggestions(data ?? []));
    } else {
      void query.ilike("descrprod", `%${trimmed}%`).then(({ data }) => setSuggestions(data ?? []));
    }
  }

  function handleProductCodeChange() {
    setProductName(null);
    const value = productCodeRef.current?.value ?? "";
    if (suggestTimerRef.current) clearTimeout(suggestTimerRef.current);
    suggestTimerRef.current = setTimeout(() => void fetchSuggestions(value), 300);
  }

  async function handleProductCodeBlur() {
    const code = productCodeRef.current?.value.trim();
    if (!code || !/^\d+$/.test(code)) { setProductName(null); return; }
    setProductNameLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("produto")
      .select("descrprod")
      .eq("codprod", Number(code))
      .maybeSingle();
    setProductName(data?.descrprod ?? "not_found");
    setProductNameLoading(false);
  }

  // ── Seleção de arquivos ───────────────────────────────────────────────────

  async function addFiles(incoming: FileList | null) {
    if (!incoming) return;

    if (isManual) {
      const pdfs = Array.from(incoming).filter(isPdfFile);
      if (pdfs.length === 0) return;
      setFiles(pdfs.slice(0, 1));
      setPreviews([]);
      setDimensionErrors([]);
      return;
    }

    if (isVideo) {
      const videos = Array.from(incoming).filter(isVideoFile);
      if (videos.length === 0) return;
      const single = videos[0];
      if (single.size > MAX_VIDEO_BYTES) {
        setDimensionErrors([`${single.name} (${(single.size / 1024 / 1024).toFixed(1)} MB — máx. 250 MB)`]);
        return;
      }
      setDimensionErrors([]);
      setFiles([single]);
      setPreviews([]);
      return;
    }

    if (isPromo) {
      const candidates = Array.from(incoming).filter(
        (f) => f.type.startsWith("image/") || isPdfFile(f)
      );
      if (candidates.length === 0) return;
      setDimensionErrors([]);
      setFiles((prev) => {
        const merged = [...prev, ...candidates];
        setPreviews(merged.map((f) => (f.type.startsWith("image/") ? URL.createObjectURL(f) : "")));
        return merged;
      });
      return;
    }

    // high / low — valida dimensões
    const candidates = Array.from(incoming).filter((f) => f.type.startsWith("image/"));
    const rejected: string[] = [];
    const valid: File[] = [];

    await Promise.all(
      candidates.map(async (f) => {
        const { ok, width, height } = await checkDimensions(f);
        if (ok) {
          valid.push(f);
        } else {
          rejected.push(`${f.name} (${width}x${height}px - min. ${MIN_DIM}x${MIN_DIM}px)`);
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
      if (isImageOnly) setPreviews(next.map((f) => URL.createObjectURL(f)));
      if (isPromo) setPreviews(next.map((f) => (f.type.startsWith("image/") ? URL.createObjectURL(f) : "")));
      return next;
    });
  }

  function handleResolutionChange(val: ResolutionType | "") {
    setResolutionType(val);
    setFiles([]);
    setPreviews([]);
    setDimensionErrors([]);
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const productCode = productCodeRef.current?.value.trim() ?? "";

    if (!productCode) { setState({ ok: false, message: "Informe o codigo do produto." }); return; }
    if (!resolutionType) { setState({ ok: false, message: "Selecione o tipo." }); return; }
    if (files.length === 0) {
      setState({
        ok: false,
        message: isManual ? "Selecione um arquivo PDF."
          : isVideo  ? "Selecione um arquivo de vídeo."
          : isPromo  ? "Selecione ao menos um arquivo."
          : "Selecione ao menos uma imagem.",
      });
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

      const skipCanvas = isManual || isVideo || isPromo || isPdfFile(file);
      const fileToUpload = skipCanvas ? file : await processImage(file, resolutionType as "high" | "low");
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

      const { data: { publicUrl } } = supabase.storage.from("product-assets").getPublicUrl(filePath);
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
          ? `${results.length}${
              isManual ? " manual(is) enviado(s) com sucesso."
              : isVideo  ? " vídeo(s) enviado(s) com sucesso."
              : isPromo  ? " arquivo(s) promocional(is) enviado(s) com sucesso."
              : " imagem(ns) enviada(s) com sucesso."
            }`
          : "Nenhum arquivo foi enviado.",
    });
  }

  return {
    state, pending, files, previews, dragging, fileProgress, dimensionErrors,
    resolutionType, productName, productNameLoading, suggestions,
    fileInputRef, productCodeRef,
    isManual, isPromo, isVideo, isImageOnly, submitLabel,
    setDragging, handleProductCodeChange, handleProductCodeBlur,
    addFiles, removeFile, handleResolutionChange, handleSubmit,
  };
}

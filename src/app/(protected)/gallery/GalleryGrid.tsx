"use client";

import { useState } from "react";
import Link from "next/link";
import { deleteProductsBulk } from "@/app/actions/images";

export interface ProductRow {
  product_code: string;
  product_name: string | null;
  total_images: number;
  high_count: number;
  low_count: number;
  manual_count: number;
  promo_count: number;
  video_count: number;
  thumb_url: string | null;
  category_name?: string | null;
}

function ProductCard({ row, selectionMode, isSelected, onSelect }: {
  row: ProductRow;
  selectionMode: boolean;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const hasHigh   = row.high_count > 0;
  const hasLow    = row.low_count > 0;
  const hasManual = row.manual_count > 0;
  const hasPromo  = row.promo_count > 0;
  const hasVideo  = row.video_count > 0;

  const inner = (
    <>
      <div className="w-full h-36 bg-gray-100 dark:bg-gray-800 overflow-hidden relative">
        {row.thumb_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={row.thumb_url}
            alt={row.product_name ? `${row.product_name} (cód. ${row.product_code})` : `Produto ${row.product_code}`}
            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-600">
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
        {selectionMode && (
          <div className={`absolute inset-0 flex items-center justify-center transition ${isSelected ? "bg-brand/20" : "bg-black/0 group-hover:bg-black/10"}`}>
            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition ${isSelected ? "bg-brand border-brand" : "border-white bg-white/60"}`}>
              {isSelected && (
                <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
          </div>
        )}
      </div>
      <div className="p-3">
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">Cód: {row.product_code}</p>
        {row.product_name && (
          <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5 truncate">{row.product_name}</p>
        )}
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{row.total_images} imagem(ns)</p>
        <div className="flex gap-1 mt-1.5 flex-wrap">
          {hasHigh   && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">Alta</span>}
          {hasLow    && <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">Baixa</span>}
          {hasManual && <span className="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-medium flex items-center gap-0.5">
            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Manual
          </span>}
          {hasPromo  && <span className="text-[10px] bg-pink-100 text-pink-700 px-1.5 py-0.5 rounded font-medium">Promo</span>}
          {hasVideo  && <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-medium">Vídeo</span>}
        </div>
      </div>
    </>
  );

  if (selectionMode) {
    return (
      <div
        onClick={onSelect}
        className={`group cursor-pointer bg-white dark:bg-gray-900 border rounded-xl overflow-hidden transition select-none ${
          isSelected
            ? "border-brand ring-2 ring-brand/30"
            : "border-gray-200 dark:border-gray-700 hover:border-brand"
        }`}
      >
        {inner}
      </div>
    );
  }

  return (
    <Link
      href={`/gallery/${encodeURIComponent(row.product_code)}`}
      className="group bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden hover:border-brand hover:shadow-md transition"
    >
      {inner}
    </Link>
  );
}

function renderGrouped(
  products: ProductRow[],
  selectionMode: boolean,
  selected: Set<string>,
  toggleSelect: (code: string) => void
) {
  const hasCategories = products.some((p) => p.category_name);
  if (!hasCategories) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {products.map((row) => (
          <ProductCard
            key={row.product_code}
            row={row}
            selectionMode={selectionMode}
            isSelected={selected.has(row.product_code)}
            onSelect={() => toggleSelect(row.product_code)}
          />
        ))}
      </div>
    );
  }

  // Group preserving insertion order; unknowns go to a "Outros" bucket at the end
  const groupMap = new Map<string, ProductRow[]>();
  const UNKNOWN = "Outros";
  for (const row of products) {
    const key = row.category_name ?? UNKNOWN;
    if (!groupMap.has(key)) groupMap.set(key, []);
    groupMap.get(key)!.push(row);
  }

  // Sort groups alphabetically, keeping "Outros" last
  const sorted = [...groupMap.entries()].sort(([a], [b]) => {
    if (a === UNKNOWN) return 1;
    if (b === UNKNOWN) return -1;
    return a.localeCompare(b, "pt-BR");
  });

  return (
    <div className="space-y-6">
      {sorted.map(([category, rows]) => (
        <div key={category} className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 whitespace-nowrap">
              {category}
            </span>
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
            <span className="text-[10px] text-gray-400 dark:text-gray-500 whitespace-nowrap">{rows.length}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {rows.map((row) => (
              <ProductCard
                key={row.product_code}
                row={row}
                selectionMode={selectionMode}
                isSelected={selected.has(row.product_code)}
                onSelect={() => toggleSelect(row.product_code)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function GalleryGrid({ products }: { products: ProductRow[] }) {
  const [selectionMode, setSelectionMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showConfirm, setShowConfirm] = useState(false);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  function toggleSelect(code: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === products.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(products.map((p) => p.product_code)));
    }
  }

  function exitSelection() {
    setSelectionMode(false);
    setSelected(new Set());
    setResult(null);
  }

  async function handleDelete() {
    setPending(true);
    setShowConfirm(false);
    const res = await deleteProductsBulk(Array.from(selected));
    setPending(false);
    setResult({ ok: res.ok, message: res.message ?? "" });
    if (res.ok) {
      setSelected(new Set());
      setSelectionMode(false);
    }
  }

  const allSelected = selected.size === products.length && products.length > 0;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 min-h-[36px]">
        {selectionMode ? (
          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={toggleAll}
              className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-brand hover:text-brand transition"
            >
              {allSelected ? "Desmarcar todos" : "Selecionar todos"}
            </button>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {selected.size} selecionado(s)
            </span>
            <button
              type="button"
              onClick={exitSelection}
              className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
            >
              Sair
            </button>
          </div>
        ) : (
          <div />
        )}
        {!selectionMode && (
          <button
            type="button"
            onClick={() => { setSelectionMode(true); setResult(null); }}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-red-400 hover:text-red-500 transition"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Excluir produtos
          </button>
        )}
      </div>

      {/* Feedback */}
      {result && (
        <p className={`text-sm px-3 py-2 rounded-lg border ${result.ok ? "bg-green-50 border-green-200 text-green-800 dark:bg-green-950/30 dark:border-green-900/50 dark:text-green-400" : "bg-red-50 border-red-200 text-red-700"}`}>
          {result.message}
        </p>
      )}

      {/* Grid — grouped by category when available */}
      {renderGrouped(products, selectionMode, selected, toggleSelect)}

      {/* Floating action bar */}
      {selectionMode && selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-gray-900 dark:bg-gray-800 text-white rounded-2xl shadow-2xl px-5 py-3">
          <span className="text-sm font-medium">{selected.size} produto(s) selecionado(s)</span>
          <button
            type="button"
            disabled={pending}
            onClick={() => setShowConfirm(true)}
            className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-semibold px-4 py-1.5 rounded-lg transition"
          >
            {pending ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            )}
            Excluir
          </button>
        </div>
      )}

      {/* Confirmation modal */}
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
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Excluir {selected.size} produto(s)?
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Os arquivos serão movidos para a lixeira do repositório.
                </p>
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
                onClick={handleDelete}
                className="text-sm px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white font-semibold transition"
              >
                Confirmar exclusão
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

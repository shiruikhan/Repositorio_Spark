"use client";

import { useState } from "react";

interface ImageEntry {
  id: string;
  resolution_type: string;
  position: number;
  public_url: string;
  created_at: string;
}

interface ApiResponse {
  product_code: string;
  quality: "high" | "low" | "all";
  total: number;
  images: ImageEntry[];
  manuals: ImageEntry[];
}

type Quality = "all" | "high" | "low";

export default function ApiTester() {
  const [code, setCode] = useState("");
  const [quality, setQuality] = useState<Quality>("all");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ApiResponse | { error: string } | null>(null);
  const [elapsed, setElapsed] = useState<number | null>(null);

  async function runTest() {
    if (!code.trim()) return;
    setLoading(true);
    setResult(null);
    const t0 = performance.now();
    try {
      const qs = quality !== "all" ? `?quality=${quality}` : "";
      const res = await fetch(`/api/products/${encodeURIComponent(code.trim())}/images${qs}`);
      const json = await res.json();
      setElapsed(Math.round(performance.now() - t0));
      setResult(json);
    } catch {
      setResult({ error: "Falha ao chamar o endpoint." });
    } finally {
      setLoading(false);
    }
  }

  const isOk = result && !("error" in result);

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && runTest()}
          placeholder="Código do produto..."
          className="flex-1 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 px-3 py-2 text-sm font-mono outline-none focus:border-brand focus:ring-1 focus:ring-brand transition"
        />
        <select
          value={quality}
          onChange={(e) => setQuality(e.target.value as Quality)}
          className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand transition"
        >
          <option value="all">Todas</option>
          <option value="high">Alta (high)</option>
          <option value="low">Baixa (low)</option>
        </select>
        <button
          onClick={runTest}
          disabled={loading || !code.trim()}
          className="bg-brand hover:bg-brand-dark disabled:opacity-50 text-white text-sm font-semibold px-5 py-2 rounded-lg transition"
        >
          {loading ? "..." : "Testar"}
        </button>
      </div>

      {result && (
        <div className="relative">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500">
              {"error" in result ? (
                <span className="text-red-500">Erro</span>
              ) : (
                <span className="text-green-600">
                  200 OK — {result.total} imagem(ns)
                  {result.manuals.length > 0 && ` · ${result.manuals.length} manual(is)`}
                  {` · quality: ${result.quality}`}
                  {elapsed !== null && ` · ${elapsed}ms`}
                </span>
              )}
            </span>
            <button
              onClick={() =>
                navigator.clipboard.writeText(JSON.stringify(result, null, 2))
              }
              className="text-xs text-gray-400 hover:text-brand transition"
            >
              Copiar JSON
            </button>
          </div>
          <pre className="bg-gray-900 text-green-300 text-xs rounded-xl p-4 overflow-auto max-h-72 font-mono leading-relaxed">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}

      {isOk && (result as ApiResponse).total === 0 && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          Nenhuma imagem encontrada para este produto com o filtro selecionado.
        </p>
      )}
    </div>
  );
}

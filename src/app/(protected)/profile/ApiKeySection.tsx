"use client";

import { useState } from "react";
import { generateApiKey, revokeApiKey } from "@/app/actions/profile";

interface Props {
  initialKey: string | null;
}

export default function ApiKeySection({ initialKey }: Props) {
  const [apiKey, setApiKey] = useState<string | null>(initialKey);
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    const result = await generateApiKey();
    setLoading(false);
    if (result.error) return setError(result.error);
    if (result.api_key) {
      setApiKey(result.api_key);
      setVisible(true);
    }
  }

  async function handleRevoke() {
    if (!confirm("Revogar a chave invalidará todos os acessos que a utilizam. Confirmar?")) return;
    setLoading(true);
    setError(null);
    const result = await revokeApiKey();
    setLoading(false);
    if (result.error) return setError(result.error);
    setApiKey(null);
    setVisible(false);
  }

  async function handleCopy() {
    if (!apiKey) return;
    await navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const masked = apiKey
    ? apiKey.slice(0, 10) + "•".repeat(apiKey.length - 14) + apiKey.slice(-4)
    : null;

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Use sua chave API no header <code className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">X-API-Key</code> ao consumir o endpoint de imagens, ou como <code className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">apikey</code> no Supabase REST direto.
      </p>

      {apiKey ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-3 py-2">
              <code className="flex-1 text-sm font-mono text-gray-800 dark:text-gray-200 truncate select-all">
                {visible ? apiKey : masked}
              </code>
              <button
                onClick={() => setVisible((v) => !v)}
                className="text-xs text-gray-400 hover:text-brand transition shrink-0"
              >
                {visible ? "Ocultar" : "Mostrar"}
              </button>
            </div>
            <button
              onClick={handleCopy}
              className="shrink-0 text-xs font-semibold border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 hover:border-brand hover:text-brand transition"
            >
              {copied ? "Copiado!" : "Copiar"}
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="text-xs font-semibold border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-1.5 hover:border-brand hover:text-brand disabled:opacity-50 transition"
            >
              {loading ? "Aguarde..." : "Gerar nova chave"}
            </button>
            <button
              onClick={handleRevoke}
              disabled={loading}
              className="text-xs font-semibold border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 rounded-lg px-3 py-1.5 hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-50 transition"
            >
              Revogar
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-gray-500 dark:text-gray-500 italic">
            Nenhuma chave API gerada.
          </p>
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="bg-brand hover:bg-brand-dark disabled:opacity-50 text-white text-sm font-semibold px-5 py-2 rounded-lg transition"
          >
            {loading ? "Gerando..." : "Gerar chave API"}
          </button>
        </div>
      )}

      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}

      <div className="text-xs text-gray-500 dark:text-gray-500 space-y-1 border-t border-gray-100 dark:border-gray-800 pt-3">
        <p>• Gerar uma nova chave invalida a anterior automaticamente.</p>
        <p>
          • Veja como usar na{" "}
          <a href="/docs" className="text-brand hover:underline">
            documentação da API
          </a>.
        </p>
      </div>
    </div>
  );
}

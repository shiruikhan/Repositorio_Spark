"use client";

import { useState, useRef } from "react";
import { changePassword } from "@/app/actions/profile";

export default function PasswordForm() {
  const [status, setStatus] = useState<{ error?: string; success?: boolean } | null>(null);
  const [loading, setLoading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    const formData = new FormData(e.currentTarget);
    const result = await changePassword(formData);
    setStatus(result);
    setLoading(false);
    if (result.success) formRef.current?.reset();
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-4 max-w-sm">
      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
          Senha atual
        </label>
        <input
          name="current_password"
          type="password"
          required
          autoComplete="current-password"
          className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand transition"
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
          Nova senha
        </label>
        <input
          name="new_password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand transition"
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
          Confirmar nova senha
        </label>
        <input
          name="confirm_password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand transition"
        />
      </div>

      {status?.error && (
        <p className="text-xs text-red-600 dark:text-red-400">{status.error}</p>
      )}
      {status?.success && (
        <p className="text-xs text-green-600 dark:text-green-400">Senha alterada com sucesso.</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="bg-brand hover:bg-brand-dark disabled:opacity-50 text-white text-sm font-semibold px-5 py-2 rounded-lg transition"
      >
        {loading ? "Salvando..." : "Alterar senha"}
      </button>
    </form>
  );
}

"use client";

import { useActionState } from "react";
import { createUser, type AdminActionState } from "@/app/actions/admin";

export default function CreateUserForm() {
  const [state, formAction, pending] = useActionState<
    AdminActionState | undefined,
    FormData
  >(createUser, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            E-mail <span className="text-brand">*</span>
          </label>
          <input
            name="email"
            type="email"
            required
            placeholder="usuario@spark.ind.br"
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand transition"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Senha <span className="text-brand">*</span>
          </label>
          <input
            name="password"
            type="password"
            required
            minLength={6}
            placeholder="Mín. 6 caracteres"
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand transition"
          />
        </div>
      </div>

      <label className="flex items-center gap-2 cursor-pointer w-fit">
        <input
          name="is_admin"
          type="checkbox"
          className="w-4 h-4 accent-brand rounded"
        />
        <span className="text-sm text-gray-700 dark:text-gray-300">
          Conceder permissão de administrador
        </span>
      </label>

      {state && (
        <p
          className={`text-sm px-3 py-2 rounded-lg border ${
            state.ok
              ? "bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400"
              : "bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400"
          }`}
        >
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center gap-2 bg-brand hover:bg-brand-dark disabled:opacity-50 text-white font-semibold text-sm px-5 py-2.5 rounded-lg transition"
      >
        {pending ? (
          <>
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Criando...
          </>
        ) : (
          "Criar usuário"
        )}
      </button>
    </form>
  );
}

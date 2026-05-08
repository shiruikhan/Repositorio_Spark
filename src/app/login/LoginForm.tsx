"use client";

import { useActionState } from "react";

type LoginAction = (
  formData: FormData
) => Promise<{ error: string } | undefined>;

export default function LoginForm({ action }: { action: LoginAction }) {
  const [state, formAction, pending] = useActionState(
    async (_prev: { error: string } | undefined, formData: FormData) => {
      return action(formData);
    },
    undefined
  );

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          E-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand transition"
          placeholder="seu@email.com"
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Senha
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand transition"
          placeholder="••••••••"
        />
      </div>

      {state?.error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full bg-brand hover:bg-brand-dark disabled:opacity-60 text-white font-semibold rounded-lg py-2.5 text-sm transition"
      >
        {pending ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}

"use client";

import { toggleAdmin, deleteUser } from "@/app/actions/admin";

interface Props {
  userId: string;
  isAdmin: boolean;
  isSelf: boolean;
}

export default function UserActions({ userId, isAdmin, isSelf }: Props) {
  return (
    <div className="flex items-center gap-2">
      <form action={() => toggleAdmin(userId, isAdmin)}>
        <button
          type="submit"
          className={`text-xs font-medium px-2.5 py-1 rounded-lg border transition ${
            isAdmin
              ? "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-400"
              : "border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
          }`}
          title={isAdmin ? "Remover admin" : "Tornar admin"}
        >
          {isAdmin ? "Admin ✓" : "Tornar admin"}
        </button>
      </form>

      {!isSelf && (
        <form
          action={() => deleteUser(userId)}
          onSubmit={(e) => {
            if (!confirm("Excluir este usuário? Esta ação não pode ser desfeita."))
              e.preventDefault();
          }}
        >
          <button
            type="submit"
            className="text-xs font-medium px-2.5 py-1 rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400 transition"
          >
            Excluir
          </button>
        </form>
      )}
    </div>
  );
}

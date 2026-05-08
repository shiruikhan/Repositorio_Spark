import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CreateUserForm from "./CreateUserForm";
import UserActions from "./UserActions";

export default async function AdminPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase
    .from("cliente")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!me?.is_admin) redirect("/dashboard");

  const { data: users } = await supabase
    .from("cliente")
    .select("id, email, nome, is_admin, codparc")
    .order("is_admin", { ascending: false })
    .order("email");

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Administração
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Gerencie os usuários com acesso ao sistema.
        </p>
      </div>

      {/* Users table */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            Usuários cadastrados{" "}
            <span className="text-gray-400 font-normal">({users?.length ?? 0})</span>
          </h3>
        </div>

        {!users || users.length === 0 ? (
          <p className="text-sm text-gray-400 px-5 py-8 text-center">
            Nenhum usuário encontrado.
          </p>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {users.map((u) => (
              <div
                key={u.id}
                className="flex items-center gap-4 px-5 py-3.5"
              >
                {/* Avatar inicial */}
                <div className="w-8 h-8 rounded-full bg-brand/10 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-brand uppercase">
                    {(u.email ?? "?")[0]}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {u.email}
                  </p>
                  {u.nome && (
                    <p className="text-xs text-gray-400 truncate">{u.nome}</p>
                  )}
                </div>

                {/* Self badge */}
                {u.id === user.id && (
                  <span className="text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded font-medium shrink-0">
                    você
                  </span>
                )}

                {/* Actions */}
                <UserActions
                  userId={u.id}
                  isAdmin={u.is_admin ?? false}
                  isSelf={u.id === user.id}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create user form */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            Criar novo usuário
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            O e-mail será confirmado automaticamente — o usuário pode fazer login imediatamente.
          </p>
        </div>
        <CreateUserForm />
      </div>
    </div>
  );
}

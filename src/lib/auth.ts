import { createClient } from "@/lib/supabase/server";

export type AdminCheck =
  | { ok: true; userId: string }
  | { ok: false; message: string };

/**
 * Garante sessão ativa e perfil admin antes de uma Server Action de escrita.
 * Sem esta checagem, o RLS bloqueia não-admins silenciosamente (UPDATE sem
 * match não retorna erro) e a action reportaria sucesso falso.
 */
export async function requireAdmin(): Promise<AdminCheck> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, message: "Sessão expirada. Faça login novamente." };

  const { data: cliente } = await supabase
    .from("cliente")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!cliente?.is_admin) {
    return { ok: false, message: "Apenas administradores podem executar esta ação." };
  }

  return { ok: true, userId: user.id };
}

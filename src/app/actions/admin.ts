"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function assertAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: cliente } = await supabase
    .from("cliente")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  return cliente?.is_admin ? user : null;
}

export type AdminActionState = {
  ok: boolean;
  message: string;
};

export async function createUser(
  _prev: AdminActionState | undefined,
  formData: FormData
): Promise<AdminActionState> {
  const caller = await assertAdmin();
  if (!caller) return { ok: false, message: "Acesso negado." };

  const email = (formData.get("email") as string)?.trim();
  const password = formData.get("password") as string;
  const isAdmin = formData.get("is_admin") === "on";

  if (!email || !password)
    return { ok: false, message: "E-mail e senha são obrigatórios." };
  if (password.length < 6)
    return { ok: false, message: "A senha deve ter pelo menos 6 caracteres." };

  const admin = createAdminClient();

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) return { ok: false, message: error.message };

  if (data.user) {
    await admin
      .from("cliente")
      .upsert({ id: data.user.id, email: data.user.email, is_admin: isAdmin });
  }

  revalidatePath("/admin");
  return { ok: true, message: `Usuário ${email} criado com sucesso.` };
}

export async function toggleAdmin(userId: string, currentValue: boolean) {
  const caller = await assertAdmin();
  if (!caller) return;

  const admin = createAdminClient();
  await admin
    .from("cliente")
    .update({ is_admin: !currentValue })
    .eq("id", userId);

  revalidatePath("/admin");
}

export async function deleteUser(userId: string) {
  const caller = await assertAdmin();
  if (!caller) return;

  // Impede auto-deleção
  if (caller.id === userId) return;

  const admin = createAdminClient();
  await admin.auth.admin.deleteUser(userId);
  revalidatePath("/admin");
}

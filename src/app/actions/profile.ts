"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function makeRandomKey(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let key = "spark_";
  for (let i = 0; i < 32; i++) {
    key += chars[Math.floor(Math.random() * chars.length)];
  }
  return key;
}

export async function changePassword(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const current = formData.get("current_password") as string;
  const newPass = formData.get("new_password") as string;
  const confirm = formData.get("confirm_password") as string;

  if (!current || !newPass || !confirm) return { error: "Preencha todos os campos." };
  if (newPass.length < 8) return { error: "A nova senha deve ter no mínimo 8 caracteres." };
  if (newPass !== confirm) return { error: "As senhas não coincidem." };

  // Verify current password by attempting sign-in
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email!,
    password: current,
  });
  if (signInError) return { error: "Senha atual incorreta." };

  const { error } = await supabase.auth.updateUser({ password: newPass });
  if (error) return { error: error.message };

  return { success: true };
}

export async function generateApiKey() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  // Delete existing key
  await supabase.from("ext_api_keys").delete().eq("user_id", user.id);

  const newKey = makeRandomKey();

  const { error } = await supabase
    .from("ext_api_keys")
    .insert({ user_id: user.id, api_key: newKey });

  if (error) return { error: error.message };

  revalidatePath("/profile");
  return { success: true, api_key: newKey };
}

export async function revokeApiKey() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { error } = await supabase
    .from("ext_api_keys")
    .delete()
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/profile");
  return { success: true };
}

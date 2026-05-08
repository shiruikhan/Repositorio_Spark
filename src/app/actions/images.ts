"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function deleteImage(id: string, filePath: string, productCode: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Sessão expirada." };

  const { error } = await supabase
    .from("ext_product_images")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null);
  if (error) return { ok: false, message: error.message };

  await createAdminClient().storage.from("product-assets").remove([filePath]);

  revalidatePath(`/gallery/${encodeURIComponent(productCode)}`);
  revalidatePath("/gallery");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function reorderImages(
  updates: { id: string; position: number }[],
  productCode: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Sessão expirada." };

  await Promise.all(
    updates.map(({ id, position }) =>
      supabase
        .from("ext_product_images")
        .update({ position })
        .eq("id", id)
        .is("deleted_at", null)
    )
  );

  revalidatePath(`/gallery/${encodeURIComponent(productCode)}`);
  return { ok: true };
}

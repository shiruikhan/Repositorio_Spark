"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function setFeaturedImage(id: string, productCode: string, makeFeatured: boolean) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Sessão expirada." };

  if (makeFeatured) {
    // Remove capa anterior do produto (se houver)
    await supabase
      .from("ext_product_images")
      .update({ is_featured: false })
      .eq("product_code", productCode)
      .eq("is_featured", true)
      .is("deleted_at", null);

    // Define nova capa
    const { error } = await supabase
      .from("ext_product_images")
      .update({ is_featured: true })
      .eq("id", id)
      .is("deleted_at", null);

    if (error) return { ok: false, message: error.message };
  } else {
    // Remove capa desta imagem (volta para seleção automática)
    const { error } = await supabase
      .from("ext_product_images")
      .update({ is_featured: false })
      .eq("id", id)
      .is("deleted_at", null);

    if (error) return { ok: false, message: error.message };
  }

  revalidatePath(`/gallery/${encodeURIComponent(productCode)}`);
  revalidatePath("/gallery");
  revalidatePath("/dashboard");
  revalidatePath("/");
  return { ok: true };
}

export async function deleteProductsBulk(productCodes: string[]) {
  if (!productCodes.length) return { ok: false, message: "Nenhum produto selecionado." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Sessão expirada." };

  const { data: images, error: fetchError } = await supabase
    .from("ext_product_images")
    .select("file_path")
    .in("product_code", productCodes)
    .is("deleted_at", null);

  if (fetchError) return { ok: false, message: fetchError.message };

  const filePaths = (images ?? []).map((img) => img.file_path);
  if (filePaths.length > 0) {
    await createAdminClient().storage.from("product-assets").remove(filePaths);
  }

  const { error: deleteError } = await supabase
    .from("ext_product_images")
    .update({ deleted_at: new Date().toISOString() })
    .in("product_code", productCodes)
    .is("deleted_at", null);

  if (deleteError) return { ok: false, message: deleteError.message };

  revalidatePath("/gallery");
  revalidatePath("/dashboard");
  productCodes.forEach((code) => revalidatePath(`/gallery/${encodeURIComponent(code)}`));

  return {
    ok: true,
    message: `${productCodes.length} produto(s) excluído(s) com ${filePaths.length} arquivo(s).`,
  };
}

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

  const results = await Promise.all(
    updates.map(({ id, position }) =>
      supabase
        .from("ext_product_images")
        .update({ position })
        .eq("id", id)
        .is("deleted_at", null)
    )
  );

  const failed = results.find((r) => r.error);
  if (failed?.error) return { ok: false, message: failed.error.message };

  revalidatePath(`/gallery/${encodeURIComponent(productCode)}`);
  return { ok: true };
}

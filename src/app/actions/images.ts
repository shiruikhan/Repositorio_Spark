"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";
import { buildThumbPath } from "@/lib/naming";

/**
 * Soft delete (D1 — opção A): o registro recebe `deleted_at` e o arquivo é
 * movido para o prefixo `trash/` no bucket, preservando a possibilidade de
 * restauração. Limpeza definitiva do `trash/` fica a cargo de rotina futura.
 * A thumbnail derivada (quando existir) vai junto — `move` de caminho
 * inexistente apenas retorna erro no resultado, sem lançar exceção.
 */
async function moveFilesToTrash(filePaths: string[]) {
  const storage = createAdminClient().storage.from("product-assets");
  const allPaths = filePaths.flatMap((path) => [path, buildThumbPath(path)]);
  const BATCH = 5;
  for (let i = 0; i < allPaths.length; i += BATCH) {
    await Promise.all(
      allPaths.slice(i, i + BATCH).map((path) => storage.move(path, `trash/${path}`))
    );
  }
}

export async function setFeaturedImage(id: string, productCode: string, makeFeatured: boolean) {
  const admin = await requireAdmin();
  if (!admin.ok) return { ok: false, message: admin.message };

  const supabase = await createClient();

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

  const admin = await requireAdmin();
  if (!admin.ok) return { ok: false, message: admin.message };

  const supabase = await createClient();

  const { data: images, error: fetchError } = await supabase
    .from("ext_product_images")
    .select("file_path")
    .in("product_code", productCodes)
    .is("deleted_at", null);

  if (fetchError) return { ok: false, message: fetchError.message };

  const filePaths = (images ?? []).map((img) => img.file_path);

  const { error: deleteError } = await supabase
    .from("ext_product_images")
    .update({ deleted_at: new Date().toISOString() })
    .in("product_code", productCodes)
    .is("deleted_at", null);

  if (deleteError) return { ok: false, message: deleteError.message };

  if (filePaths.length > 0) {
    await moveFilesToTrash(filePaths);
  }

  revalidatePath("/gallery");
  revalidatePath("/dashboard");
  productCodes.forEach((code) => revalidatePath(`/gallery/${encodeURIComponent(code)}`));

  return {
    ok: true,
    message: `${productCodes.length} produto(s) excluído(s) com ${filePaths.length} arquivo(s) movido(s) para a lixeira.`,
  };
}

export async function deleteImage(id: string, filePath: string, productCode: string) {
  const admin = await requireAdmin();
  if (!admin.ok) return { ok: false, message: admin.message };

  const supabase = await createClient();

  const { error } = await supabase
    .from("ext_product_images")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null);
  if (error) return { ok: false, message: error.message };

  await moveFilesToTrash([filePath]);

  revalidatePath(`/gallery/${encodeURIComponent(productCode)}`);
  revalidatePath("/gallery");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function reorderImages(
  updates: { id: string; position: number }[],
  productCode: string
) {
  const admin = await requireAdmin();
  if (!admin.ok) return { ok: false, message: admin.message };

  const supabase = await createClient();

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

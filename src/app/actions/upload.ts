"use server";

import { createClient } from "@/lib/supabase/server";
import { buildFilePath, type ResolutionType } from "@/lib/naming";

export type UploadedImage = {
  fileName: string;
  filePath: string;
  publicUrl: string;
};

export type UploadError = {
  fileName: string;
  message: string;
};

export type UploadState = {
  ok: boolean;
  productCode?: string;
  results?: UploadedImage[];
  errors?: UploadError[];
  message?: string;
};

export async function uploadImages(
  _prev: UploadState | undefined,
  formData: FormData
): Promise<UploadState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, message: "Sessão expirada. Faça login novamente." };

  const productCode = (formData.get("product_code") as string)?.trim();
  const resolutionType = formData.get("resolution_type") as ResolutionType;
  const files = formData.getAll("files") as File[];

  if (!productCode) return { ok: false, message: "Informe o código do produto." };
  if (!["high", "low"].includes(resolutionType))
    return { ok: false, message: "Selecione o tipo de resolução." };
  if (files.length === 0 || (files.length === 1 && files[0].size === 0))
    return { ok: false, message: "Selecione ao menos uma imagem." };

  // Descobre a maior posição já existente para este produto + tipo,
  // garantindo que novos uploads continuem a sequência sem sobrescrever.
  const { data: existing } = await supabase
    .from("ext_product_images")
    .select("position")
    .eq("product_code", productCode)
    .eq("resolution_type", resolutionType)
    .order("position", { ascending: false })
    .limit(1);

  const startPosition = existing && existing.length > 0
    ? (existing[0].position as number) + 1
    : 0;

  const timestamp = Date.now();
  const results: UploadedImage[] = [];
  const errors: UploadError[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const position = startPosition + i;
    const filePath = buildFilePath(productCode, resolutionType, timestamp, position, file.name);

    // upsert: false — nunca sobrescreve um arquivo existente no bucket
    const { error: storageError } = await supabase.storage
      .from("product-assets")
      .upload(filePath, file, { upsert: false, contentType: file.type });

    if (storageError) {
      errors.push({ fileName: file.name, message: storageError.message });
      continue;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("product-assets").getPublicUrl(filePath);

    const { error: dbError } = await supabase.from("ext_product_images").insert({
      product_code: productCode,
      file_path: filePath,
      resolution_type: resolutionType,
      position,
      public_url: publicUrl,
    });

    if (dbError) {
      errors.push({ fileName: file.name, message: dbError.message });
      continue;
    }

    results.push({ fileName: file.name, filePath, publicUrl });
  }

  return {
    ok: errors.length === 0,
    productCode,
    results,
    errors,
    message:
      results.length > 0
        ? `${results.length} imagem(ns) enviada(s) com sucesso.`
        : "Nenhuma imagem foi enviada.",
  };
}

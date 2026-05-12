"use server";

import { createClient } from "@/lib/supabase/server";

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

export type SaveImagePayload = {
  productCode: string;
  resolutionType: "high" | "low" | "manual";
  filePath: string;
  publicUrl: string;
  position: number;
};

/** Salva os metadados de uma imagem já enviada ao Storage. */
export async function saveImageRecord(
  payload: SaveImagePayload
): Promise<{ ok: boolean; message?: string }> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { ok: false, message: "Sessão expirada. Faça login novamente." };

    const { error } = await supabase.from("ext_product_images").insert({
      product_code: payload.productCode,
      file_path: payload.filePath,
      resolution_type: payload.resolutionType,
      position: payload.position,
      public_url: payload.publicUrl,
    });

    if (error) return { ok: false, message: error.message };

    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro inesperado.";
    return { ok: false, message };
  }
}

/** Obtém a próxima posição disponível para um produto + tipo. */
export async function getNextPosition(
  productCode: string,
  resolutionType: "high" | "low" | "manual"
): Promise<number> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("ext_product_images")
      .select("position")
      .eq("product_code", productCode)
      .eq("resolution_type", resolutionType)
      .is("deleted_at", null)
      .order("position", { ascending: false })
      .limit(1);

    return data && data.length > 0 ? (data[0].position as number) + 1 : 0;
  } catch {
    return 0;
  }
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import JSZip from "jszip";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// Limites defensivos — o ZIP é montado inteiro em memória.
const MAX_IMAGES = 200;
const MAX_TOTAL_BYTES = 200 * 1024 * 1024; // 200 MB

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ productCode: string }> }
) {
  const { productCode } = await params;
  const code = decodeURIComponent(productCode).trim();

  if (!code) {
    return NextResponse.json(
      { error: "product_code is required" },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  // SELECT em ext_product_images é público (RLS) — a chave anônima basta,
  // evitando expor a service role neste endpoint público.
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data, error } = await supabase
    .from("ext_product_images")
    .select("id, file_path, resolution_type, position, public_url")
    .eq("product_code", code)
    .is("deleted_at", null)
    .order("resolution_type")
    .order("position")
    .limit(MAX_IMAGES);

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500, headers: CORS_HEADERS }
    );
  }

  if (!data || data.length === 0) {
    return NextResponse.json(
      { error: "Nenhuma imagem encontrada para este produto." },
      { status: 404, headers: CORS_HEADERS }
    );
  }

  const zip = new JSZip();
  let totalBytes = 0;

  await Promise.all(
    data.map(async (img) => {
      if (!img.public_url) return;
      if (totalBytes >= MAX_TOTAL_BYTES) return;
      try {
        const res = await fetch(img.public_url);
        if (!res.ok) return;
        const buffer = await res.arrayBuffer();
        totalBytes += buffer.byteLength;
        if (totalBytes > MAX_TOTAL_BYTES) return;
        const filename = img.file_path.split("/").pop() ?? img.id;
        const folder =
          img.resolution_type === "high"    ? "alta_resolucao" :
          img.resolution_type === "manual"  ? "manuais" :
          "baixa_resolucao";
        zip.folder(folder)?.file(filename, buffer);
      } catch {
        // skip on error
      }
    })
  );

  // base64 string avoids Uint8Array type mismatch with NextResponse
  const zipBase64 = await zip.generateAsync({ type: "base64" });
  const zipBytes = Buffer.from(zipBase64, "base64");

  const h = new Headers(CORS_HEADERS);
  h.set("Content-Type", "application/zip");
  h.set("Content-Disposition", "attachment; filename=spark_" + code + "_imagens.zip");
  h.set("Cache-Control", "no-store");

  return new NextResponse(zipBytes, { status: 200, headers: h });
}

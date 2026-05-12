import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dir = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dir, "..", ".env.local");
const envLines = readFileSync(envPath, "utf-8").split("\n");
const env = {};
for (const line of envLines) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, "");
}

const SUPABASE_URL = (env["NEXT_PUBLIC_SUPABASE_URL"] || "").trim()
  || "https://obbymrwivuhjopwnmoxx.supabase.co";
const SERVICE_KEY  = (env["SUPABASE_SERVICE_ROLE_KEY"] || "").trim();

if (!SERVICE_KEY) {
  console.error("SUPABASE_SERVICE_ROLE_KEY nao encontrada no .env.local");
  process.exit(1);
}

console.log("Conectando em:", SUPABASE_URL);
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function main() {
  const { data: images, error } = await supabase
    .from("ext_product_images")
    .select("id, product_code, file_path, public_url, resolution_type")
    .is("deleted_at", null)
    .order("created_at");

  if (error) {
    console.error("Erro ao buscar imagens:", error.message);
    process.exit(1);
  }

  console.log("Imagens encontradas: " + images.length);
  console.log("AVISO: imagens JPEG com fundo preto ja composited nao podem ser recuperadas.");
  console.log("       Essas precisam ser deletadas e re-enviadas pelo painel.");
  console.log("=".repeat(60));

  let updated = 0, skipped = 0, failed = 0;

  for (const img of images) {
    const label = "[" + img.product_code + "] " + path.basename(img.file_path);

    if (!img.public_url) {
      console.log("  SKIP  " + label + " (sem public_url)");
      skipped++;
      continue;
    }

    try {
      const res = await fetch(img.public_url);
      if (!res.ok) throw new Error("HTTP " + res.status);
      const buffer = Buffer.from(await res.arrayBuffer());

      const meta = await sharp(buffer).metadata();
      const fmt = meta.format || "unknown";

      // Apenas pula se ja for JPEG sem nenhum canal alfa E extensao ja e .jpg
      // (significa que ja foi processado por esta rotina antes)
      const alreadyProcessed = fmt === "jpeg" && !meta.hasAlpha
        && img.file_path.toLowerCase().endsWith(".jpg");

      if (alreadyProcessed) {
        console.log("  OK    " + label + " (JPEG processado)");
        skipped++;
        continue;
      }

      console.log("  PROC  " + label + " (formato=" + fmt + " alfa=" + !!meta.hasAlpha + ")");

      const isLow = img.resolution_type === "low";
      let pipeline = sharp(buffer).flatten({ background: { r: 255, g: 255, b: 255 } });
      if (isLow) {
        pipeline = pipeline.resize({ width: 800, withoutEnlargement: true });
      }
      const processed = await pipeline.jpeg({ quality: isLow ? 88 : 95 }).toBuffer();

      const oldPath = img.file_path;
      const newPath = oldPath.replace(/\.[^.]+$/, ".jpg");

      const { error: upErr } = await supabase.storage
        .from("product-assets")
        .upload(newPath, processed, { contentType: "image/jpeg", upsert: true });
      if (upErr) throw new Error("Upload: " + upErr.message);

      const { data: urlData } = supabase.storage.from("product-assets").getPublicUrl(newPath);
      const publicUrl = urlData.publicUrl;

      const { error: dbErr } = await supabase
        .from("ext_product_images")
        .update({ file_path: newPath, public_url: publicUrl })
        .eq("id", img.id);
      if (dbErr) throw new Error("DB: " + dbErr.message);

      if (oldPath !== newPath) {
        await supabase.storage.from("product-assets").remove([oldPath]);
        console.log("  DONE  " + path.basename(oldPath) + " -> " + path.basename(newPath));
      } else {
        console.log("  DONE  " + path.basename(newPath) + " (conteudo atualizado)");
      }

      updated++;
    } catch (err) {
      console.error("  FAIL  " + label + ": " + err.message);
      failed++;
    }
  }

  console.log("=".repeat(60));
  console.log("Resultado: " + updated + " atualizadas | " + skipped + " ignoradas | " + failed + " falhas");
  if (updated > 0 || skipped > 0) {
    console.log("");
    console.log("Imagens JPEG que ainda aparecem com fundo preto precisam ser");
    console.log("deletadas e re-enviadas pelo painel com o novo codigo deployado.");
  }
}

main().catch(console.error);

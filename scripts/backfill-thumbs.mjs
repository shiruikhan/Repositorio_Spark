/**
 * Backfill de thumbnails (D2 — opção A).
 *
 * Para cada imagem high/low ativa sem thumb_url:
 *   1. baixa o original do bucket product-assets
 *   2. gera miniatura jpeg com maior lado = 400px (sharp)
 *   3. sobe em {code}/thumbs/{base}_thumb.jpg
 *   4. grava thumb_url no registro
 *
 * Idempotente: pula registros que já têm thumb_url; upload usa upsert.
 * Uso: node scripts/backfill-thumbs.mjs
 */
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

const THUMB_MAX = 400;
const BATCH = 5;

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
const storage = supabase.storage.from("product-assets");

/** Mesmo contrato de src/lib/naming.ts (buildThumbPath). */
function buildThumbPath(filePath) {
  const slashIdx = filePath.indexOf("/");
  const dir = slashIdx === -1 ? "" : filePath.slice(0, slashIdx);
  const filename = slashIdx === -1 ? filePath : filePath.slice(slashIdx + 1);
  const base = filename.replace(/\.[^.]+$/, "");
  return `${dir ? `${dir}/` : ""}thumbs/${base}_thumb.jpg`;
}

async function processRow(row) {
  const { data: blob, error: dlError } = await storage.download(row.file_path);
  if (dlError) return { id: row.id, ok: false, error: `download: ${dlError.message}` };

  let thumbBuffer;
  try {
    thumbBuffer = await sharp(Buffer.from(await blob.arrayBuffer()))
      .flatten({ background: "#FFFFFF" })
      .resize(THUMB_MAX, THUMB_MAX, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();
  } catch (err) {
    return { id: row.id, ok: false, error: `sharp: ${err.message}` };
  }

  const thumbPath = buildThumbPath(row.file_path);
  const { error: upError } = await storage.upload(thumbPath, thumbBuffer, {
    upsert: true,
    contentType: "image/jpeg",
  });
  if (upError) return { id: row.id, ok: false, error: `upload: ${upError.message}` };

  const { data: { publicUrl } } = storage.getPublicUrl(thumbPath);
  const { error: dbError } = await supabase
    .from("ext_product_images")
    .update({ thumb_url: publicUrl })
    .eq("id", row.id);
  if (dbError) return { id: row.id, ok: false, error: `db: ${dbError.message}` };

  return { id: row.id, ok: true, path: thumbPath };
}

async function main() {
  console.log("Conectando em:", SUPABASE_URL);

  const { data: rows, error } = await supabase
    .from("ext_product_images")
    .select("id, file_path")
    .in("resolution_type", ["high", "low"])
    .is("deleted_at", null)
    .is("thumb_url", null)
    .order("product_code");

  if (error) {
    console.error("Erro ao listar imagens:", error.message);
    process.exit(1);
  }

  console.log(`${rows.length} imagem(ns) sem thumbnail.`);
  let ok = 0;
  const failures = [];

  for (let i = 0; i < rows.length; i += BATCH) {
    const results = await Promise.all(rows.slice(i, i + BATCH).map(processRow));
    for (const r of results) {
      if (r.ok) ok++;
      else failures.push(r);
    }
    process.stdout.write(`\r${Math.min(i + BATCH, rows.length)}/${rows.length} processadas...`);
  }

  console.log(`\nConcluido: ${ok} thumbnail(s) gerada(s), ${failures.length} falha(s).`);
  for (const f of failures) console.error(`  FALHA ${f.id}: ${f.error}`);
  process.exit(failures.length > 0 ? 1 : 0);
}

main();

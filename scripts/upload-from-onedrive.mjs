/**
 * upload-from-onedrive.mjs
 *
 * Varre as pastas PNG no OneDrive, localiza arquivos >= 1 MB (alta resolucao)
 * e faz upload pro Supabase como resolution_type = 'high'.
 * Pula produtos que JA possuem imagens high no banco.
 *
 * Uso:
 *   node scripts/upload-from-onedrive.mjs            -> dry-run (apenas lista)
 *   node scripts/upload-from-onedrive.mjs --confirm  -> sobe de verdade
 */

import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { readFileSync, readdirSync, statSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

// --- CONFIGURACAO -------------------------------------------------------
const FOTOS_ROOT    = "C:\\Users\\silvio\\OneDrive - SPARK ELETRONICA LTDA (1)\\Fotos";
const JPEG_QUALITY  = 95;   // alta resolucao: qualidade maxima
// -----------------------------------------------------------------------

const isDryRun = !process.argv.includes("--confirm");

const __dir   = path.dirname(fileURLToPath(import.meta.url));
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

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// -----------------------------------------------------------------------

function extractProductCode(folderName) {
  const match = folderName.match(/\b(\d{5,8})\b/);
  return match ? match[1] : null;
}

function findPngFolders(dir, results = []) {
  let entries;
  try { entries = readdirSync(dir); } catch { return results; }
  for (const entry of entries) {
    const full = path.join(dir, entry);
    let stat;
    try { stat = statSync(full); } catch { continue; }
    if (!stat.isDirectory()) continue;
    if (entry.toUpperCase() === "PNG") {
      const productFolder = path.basename(path.dirname(full));
      const productCode   = extractProductCode(productFolder);
      if (productCode) results.push({ imgDir: full, productCode, productFolder });
    } else {
      findPngFolders(full, results);
    }
  }
  return results;
}

const HIGH_RES_MIN_BYTES = 1 * 1024 * 1024; // 1 MB

/** Retorna arquivos PNG com tamanho >= 1 MB (alta resolucao) */
function findHighResFiles(dir) {
  let entries;
  try { entries = readdirSync(dir); } catch { return []; }
  return entries
    .filter(f => /\.png$/i.test(f))
    .map(f => {
      const full = path.join(dir, f);
      let size = 0;
      try { size = statSync(full).size; } catch { /* ignore */ }
      return { full, size };
    })
    .filter(({ size }) => size >= HIGH_RES_MIN_BYTES)
    .sort((a, b) => a.full.localeCompare(b.full))
    .map(({ full }) => full);
}

/** Fundo branco + converte para JPEG (sem redimensionar) */
async function processImage(filePath) {
  const buffer = readFileSync(filePath);
  return sharp(buffer)
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .jpeg({ quality: JPEG_QUALITY })
    .toBuffer();
}

// -----------------------------------------------------------------------

async function main() {
  console.log("Pasta raiz :", FOTOS_ROOT);
  console.log("Tipo       : HIGH (alta resolucao)");
  console.log("Modo       :", isDryRun ? "DRY-RUN — use --confirm para subir de verdade" : "UPLOAD");
  console.log("=".repeat(60));

  // Produtos que JA possuem high no banco
  const { data: existing } = await supabase
    .from("ext_product_images")
    .select("product_code")
    .eq("resolution_type", "high")
    .is("deleted_at", null);

  const alreadyHigh = new Set((existing || []).map(r => r.product_code));
  console.log(`Produtos com high ja no banco: ${alreadyHigh.size} (serao ignorados)`);
  console.log("");

  const pngFolders = findPngFolders(FOTOS_ROOT);

  // Agrupa por produto
  const byProduct = {};
  for (const { imgDir, productCode, productFolder } of pngFolders) {
    if (!byProduct[productCode]) {
      byProduct[productCode] = { productFolder, files: [] };
    }
    byProduct[productCode].files.push(...findHighResFiles(imgDir));
  }

  // Separa quem falta e quem ja tem
  const pending  = Object.keys(byProduct).filter(c => !alreadyHigh.has(c)).sort();
  const skippedAlready = Object.keys(byProduct).filter(c =>  alreadyHigh.has(c)).sort();

  const totalFiles = pending.reduce((s, c) => s + byProduct[c].files.length, 0);

  console.log(`Produtos encontrados no OneDrive: ${Object.keys(byProduct).length}`);
  console.log(`  -> Ja possuem high (serao pulados): ${skippedAlready.length}`);
  console.log(`  -> Faltam high (serao enviados)  : ${pending.length}  |  ${totalFiles} arquivo(s)`);
  console.log("");

  if (pending.length === 0) {
    console.log("Todos os produtos ja possuem imagens high. Nada a fazer.");
    return;
  }

  for (const code of pending) {
    const { productFolder, files } = byProduct[code];
    console.log(`  [${code}] ${productFolder}`);
    for (const f of files) {
      console.log(`    - ${path.basename(f)}`);
    }
  }

  if (isDryRun) {
    console.log("");
    console.log("=".repeat(60));
    console.log("DRY-RUN concluido. Nenhum arquivo foi enviado.");
    console.log("Para subir de verdade:");
    console.log("  node scripts/upload-from-onedrive.mjs --confirm");
    return;
  }

  // -- UPLOAD -----------------------------------------------------------
  console.log("");
  console.log("Iniciando upload...");
  console.log("=".repeat(60));

  let uploaded = 0, failed = 0;

  for (const code of pending) {
    const { files } = byProduct[code];
    const timestamp = Date.now();
    let position = 0;

    for (const filePath of files) {
      const label = `[${code}] ${path.basename(filePath)}`;
      try {
        const processed   = await processImage(filePath);
        const newName     = `${code}_high_${timestamp}_${position}.jpg`;
        const storagePath = `${code}/${newName}`;

        const { error: upErr } = await supabase.storage
          .from("product-assets")
          .upload(storagePath, processed, { contentType: "image/jpeg", upsert: true });
        if (upErr) throw new Error("Storage: " + upErr.message);

        const { data: urlData } = supabase.storage
          .from("product-assets")
          .getPublicUrl(storagePath);

        const { error: dbErr } = await supabase
          .from("ext_product_images")
          .insert({
            product_code:    code,
            file_path:       storagePath,
            public_url:      urlData.publicUrl,
            resolution_type: "high",
            position:        position,
          });
        if (dbErr) throw new Error("DB: " + dbErr.message);

        console.log(`  OK    ${label} -> ${newName}`);
        uploaded++;
        position++;
      } catch (err) {
        console.error(`  FAIL  ${label}: ${err.message}`);
        failed++;
      }
    }
  }

  console.log("=".repeat(60));
  console.log(`Resultado: ${uploaded} enviadas | ${failed} falhas`);
}

main().catch(console.error);

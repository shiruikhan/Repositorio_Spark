/**
 * upload-from-onedrive.mjs
 *
 * Varre as pastas PNG no diretorio escolhido e sobe todas as imagens encontradas.
 * Classifica como 'high' (>= 1 MB) ou 'low' (< 1 MB).
 * Ignora produtos cujo codprod ja tenha qualquer arquivo no storage.
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
const DEFAULT_FOTOS_ROOT = "C:\\Users\\silvio\\OneDrive - SPARK ELETRONICA LTDA (1)\\Fotos";
const HIGH_JPEG_QUALITY  = 95;
const LOW_JPEG_QUALITY   = 88;
const LOW_MAX_WIDTH      = 800;
// -----------------------------------------------------------------------

function getArgValue(flag) {
  const flagEq = flag + "=";
  const eqArg = process.argv.find((a) => a.startsWith(flagEq));
  if (eqArg) return eqArg.slice(flagEq.length);
  const idx = process.argv.indexOf(flag);
  if (idx !== -1 && process.argv[idx + 1] && !process.argv[idx + 1].startsWith("--")) {
    return process.argv[idx + 1];
  }
  return null;
}

const wantsHelp = process.argv.includes("--help") || process.argv.includes("-h");
const isDryRun = !process.argv.includes("--confirm");

const __dir   = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dir, "..", ".env.local");
const envLines = readFileSync(envPath, "utf-8").split("\n");
const env = {};
for (const line of envLines) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, "");
}

const FOTOS_ROOT =
  (getArgValue("--root") || getArgValue("--dir") || "").trim()
  || (process.env.FOTOS_ROOT || "").trim()
  || (env["FOTOS_ROOT"] || "").trim()
  || (env["ONEDRIVE_FOTOS_ROOT"] || "").trim()
  || DEFAULT_FOTOS_ROOT;

if (wantsHelp) {
  console.log("");
  console.log("Uso:");
  console.log("  node scripts/upload-from-onedrive.mjs [--root <pasta>] [--confirm]");
  console.log("");
  console.log("Opcoes:");
  console.log("  --root, --dir   Pasta raiz a ser varrida (default: " + DEFAULT_FOTOS_ROOT + ")");
  console.log("  --confirm       Faz upload de verdade (sem isso, roda em dry-run)");
  console.log("  -h, --help      Mostra esta ajuda");
  console.log("");
  process.exit(0);
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

const HIGH_RES_MIN_BYTES = 1 * 1024 * 1024; // 1 MB

function isImageFile(name) {
  return /\.(png|jpe?g|webp)$/i.test(name);
}

function scanImagesByProduct(rootDir) {
  const byProduct = {};
  const unmatched = [];
  let dirsVisited = 0;
  let filesVisited = 0;

  function walk(dir, inheritedCode = null, inheritedFolder = null) {
    dirsVisited++;

    const dirName = path.basename(dir);
    const codeFromDir = extractProductCode(dirName);
    const currentCode = codeFromDir || inheritedCode;
    const currentFolder = codeFromDir ? dirName : inheritedFolder;

    let entries;
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }

    for (const entry of entries) {
      const full = path.join(dir, entry);
      let stat;
      try {
        stat = statSync(full);
      } catch {
        continue;
      }

      if (stat.isDirectory()) {
        walk(full, currentCode, currentFolder);
        continue;
      }

      if (!stat.isFile()) continue;
      filesVisited++;
      if (!isImageFile(entry)) continue;

      const code = currentCode || extractProductCode(entry);
      if (!code) {
        if (unmatched.length < 25) unmatched.push(full);
        continue;
      }

      if (!byProduct[code]) {
        byProduct[code] = { productFolder: currentFolder || code, files: [] };
      }
      byProduct[code].files.push({ full, size: stat.size });
    }
  }

  walk(rootDir);

  for (const code of Object.keys(byProduct)) {
    byProduct[code].files.sort((a, b) => a.full.localeCompare(b.full));
  }

  return { byProduct, unmatched, dirsVisited, filesVisited };
}

async function processImage(filePath, resolutionType) {
  const buffer = readFileSync(filePath);
  let pipeline = sharp(buffer).flatten({ background: { r: 255, g: 255, b: 255 } });
  if (resolutionType === "low") {
    pipeline = pipeline.resize({ width: LOW_MAX_WIDTH, withoutEnlargement: true });
  }
  return pipeline.jpeg({ quality: resolutionType === "low" ? LOW_JPEG_QUALITY : HIGH_JPEG_QUALITY }).toBuffer();
}

// -----------------------------------------------------------------------

async function productHasAnyFileInStorage(productCode) {
  const { data, error } = await supabase.storage
    .from("product-assets")
    .list(productCode, { limit: 1, offset: 0 });

  if (error) {
    throw new Error("Storage list: " + error.message);
  }

  return (data || []).length > 0;
}

async function getNextPosition(productCode, resolutionType) {
  const { data, error } = await supabase
    .from("ext_product_images")
    .select("position")
    .eq("product_code", productCode)
    .eq("resolution_type", resolutionType)
    .is("deleted_at", null)
    .order("position", { ascending: false })
    .limit(1);

  if (error) throw new Error("DB getNextPosition: " + error.message);
  return data && data.length > 0 ? (data[0].position ?? 0) + 1 : 0;
}

async function main() {
  try {
    const st = statSync(FOTOS_ROOT);
    if (!st.isDirectory()) throw new Error("nao e um diretorio");
  } catch {
    console.error("Pasta raiz invalida:", FOTOS_ROOT);
    console.error("Use --root <pasta> (ou defina FOTOS_ROOT).");
    process.exit(1);
  }

  console.log("Pasta raiz :", FOTOS_ROOT);
  console.log("Classifica : HIGH >= " + (HIGH_RES_MIN_BYTES / (1024 * 1024)).toFixed(0) + " MB | LOW < isso");
  console.log("Modo       :", isDryRun ? "DRY-RUN — use --confirm para subir de verdade" : "UPLOAD");
  console.log("=".repeat(60));

  const { byProduct, unmatched, dirsVisited, filesVisited } = scanImagesByProduct(FOTOS_ROOT);

  const productCodes = Object.keys(byProduct).sort();
  const totalFoundFiles = productCodes.reduce((s, c) => s + byProduct[c].files.length, 0);
  console.log("Diretorios visitados: " + dirsVisited);
  console.log("Arquivos visitados  : " + filesVisited);
  console.log("Imagens encontradas : " + totalFoundFiles);
  console.log("Produtos detectados : " + productCodes.length);
  if (unmatched.length > 0) {
    console.log("Imagens sem codprod detectavel (exemplos):");
    for (const p of unmatched) console.log("  - " + p);
  }
  console.log("");

  if (productCodes.length === 0) {
    console.log("Nenhum codprod foi detectado a partir dos nomes das pastas/arquivos.");
    console.log("Regra atual: precisa existir um numero de 5 a 8 digitos no nome da pasta (recomendado) ou do arquivo.");
    return;
  }

  const pending = [];
  const skippedAlready = [];
  const hasInStorageCache = new Map();

  for (const code of productCodes) {
    let hasAny = false;
    try {
      hasAny = await productHasAnyFileInStorage(code);
    } catch (e) {
      console.error("Aviso: falha ao checar storage para " + code + ": " + e.message);
      hasAny = false;
    }
    hasInStorageCache.set(code, hasAny);
    if (hasAny) skippedAlready.push(code);
    else pending.push(code);
  }

  const totalFiles = pending.reduce((s, c) => s + byProduct[c].files.length, 0);

  console.log(`Produtos encontrados: ${Object.keys(byProduct).length}`);
  console.log(`  -> Ja possuem no storage (serao pulados): ${skippedAlready.length}`);
  console.log(`  -> Serao enviados                    : ${pending.length}  |  ${totalFiles} arquivo(s)`);
  console.log("");

  if (pending.length === 0) {
    console.log("Todos os produtos ja possuem arquivos no storage. Nada a fazer.");
    return;
  }

  for (const code of pending) {
    const { productFolder, files } = byProduct[code];
    console.log(`  [${code}] ${productFolder}`);
    for (const f of files) {
      const type = f.size >= HIGH_RES_MIN_BYTES ? "high" : "low";
      console.log(`    - ${path.basename(f.full)} (${type})`);
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
    let nextHigh = 0;
    let nextLow = 0;
    try {
      [nextHigh, nextLow] = await Promise.all([
        getNextPosition(code, "high"),
        getNextPosition(code, "low"),
      ]);
    } catch (e) {
      console.error("  FAIL  [" + code + "] erro ao buscar posicoes no banco: " + e.message);
      failed += files.length;
      continue;
    }

    for (const filePath of files) {
      const resolutionType = filePath.size >= HIGH_RES_MIN_BYTES ? "high" : "low";
      const position = resolutionType === "high" ? nextHigh : nextLow;
      const label = `[${code}] ${path.basename(filePath.full)} (${resolutionType})`;
      try {
        const processed   = await processImage(filePath.full, resolutionType);
        const newName     = `${code}_${resolutionType}_${timestamp}_${position}.jpg`;
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
            resolution_type: resolutionType,
            position:        position,
          });
        if (dbErr) throw new Error("DB: " + dbErr.message);

        console.log(`  OK    ${label} -> ${newName}`);
        uploaded++;
        if (resolutionType === "high") nextHigh++;
        else nextLow++;
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

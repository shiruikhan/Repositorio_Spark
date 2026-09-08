/**
 * Troca de SKU de produtos (ago/2026).
 *
 * Para cada par (código antigo → código novo):
 *   1. lista as imagens ativas em ext_product_images do código antigo
 *   2. move cada arquivo (e sua thumb, se houver) no bucket product-assets
 *      para o novo prefixo de código, via storage.move (rename in-place)
 *   3. atualiza product_code, file_path, public_url e thumb_url no registro
 *
 * Não idempotente para reexecução após sucesso parcial de um mesmo registro
 * (o arquivo já terá sido movido); em caso de falha, o script reporta e
 * segue para o próximo, sem tocar no registro do banco daquele item.
 *
 * Uso: node scripts/rename-sku.mjs
 */
import { createClient } from "@supabase/supabase-js";
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
const SERVICE_KEY = (env["SUPABASE_SERVICE_ROLE_KEY"] || "").trim();

if (!SERVICE_KEY) {
  console.error("SUPABASE_SERVICE_ROLE_KEY nao encontrada no .env.local");
  process.exit(1);
}

const MAPPING = [
  ["3134019", "3134033"],
  ["3134020", "3134034"],
  ["3134021", "3134035"],
  ["3134022", "3134036"],
  ["3134027", "3134037"],
  ["3134028", "3134038"],
  ["3134029", "3134039"],
  ["3134030", "3134040"],
  ["3134013", "3134041"],
  ["3134014", "3134042"],
  ["3134015", "3134043"],
  ["3134016", "3134044"],
  ["3134017", "3134045"],
  ["3134018", "3134046"],
];

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

/** Substitui o código do produto no diretório e no prefixo do nome do arquivo. */
function remapPath(filePath, oldCode, newCode) {
  const parts = filePath.split("/");
  if (parts[0] !== oldCode) {
    throw new Error(`caminho "${filePath}" não começa com o código esperado "${oldCode}"`);
  }
  parts[0] = newCode;
  const filename = parts[parts.length - 1];
  if (!filename.startsWith(`${oldCode}_`)) {
    throw new Error(`arquivo "${filename}" não começa com o prefixo esperado "${oldCode}_"`);
  }
  parts[parts.length - 1] = `${newCode}_${filename.slice(oldCode.length + 1)}`;
  return parts.join("/");
}

async function processRow(row, oldCode, newCode) {
  const newFilePath = remapPath(row.file_path, oldCode, newCode);

  const { error: moveError } = await storage.move(row.file_path, newFilePath);
  if (moveError) {
    return { id: row.id, ok: false, error: `move file: ${moveError.message}` };
  }

  let newThumbUrl = null;
  if (row.thumb_url) {
    const oldThumbPath = buildThumbPath(row.file_path);
    const newThumbPath = buildThumbPath(newFilePath);
    const { error: thumbMoveError } = await storage.move(oldThumbPath, newThumbPath);
    if (thumbMoveError) {
      return { id: row.id, ok: false, error: `move thumb: ${thumbMoveError.message}` };
    }
    newThumbUrl = storage.getPublicUrl(newThumbPath).data.publicUrl;
  }

  const newPublicUrl = storage.getPublicUrl(newFilePath).data.publicUrl;

  const { error: dbError } = await supabase
    .from("ext_product_images")
    .update({
      product_code: newCode,
      file_path: newFilePath,
      public_url: newPublicUrl,
      thumb_url: newThumbUrl,
    })
    .eq("id", row.id);
  if (dbError) {
    return { id: row.id, ok: false, error: `db: ${dbError.message}` };
  }

  return { id: row.id, ok: true, path: newFilePath };
}

async function main() {
  console.log("Conectando em:", SUPABASE_URL);
  console.log(`${MAPPING.length} produto(s) a renomear.\n`);

  let totalOk = 0;
  const totalFailures = [];

  for (const [oldCode, newCode] of MAPPING) {
    const { data: rows, error } = await supabase
      .from("ext_product_images")
      .select("id, file_path, thumb_url")
      .eq("product_code", oldCode)
      .is("deleted_at", null);

    if (error) {
      console.error(`${oldCode} -> ${newCode}: erro ao listar imagens: ${error.message}`);
      totalFailures.push({ id: `(listagem ${oldCode})`, error: error.message });
      continue;
    }

    console.log(`${oldCode} -> ${newCode}: ${rows.length} imagem(ns)`);
    const BATCH = 5;
    let ok = 0;
    const failures = [];
    for (let i = 0; i < rows.length; i += BATCH) {
      const results = await Promise.all(
        rows.slice(i, i + BATCH).map((row) => processRow(row, oldCode, newCode))
      );
      for (const r of results) {
        if (r.ok) ok++;
        else failures.push(r);
      }
    }
    console.log(`  ${ok} ok, ${failures.length} falha(s)`);
    for (const f of failures) console.error(`    FALHA ${f.id}: ${f.error}`);

    totalOk += ok;
    totalFailures.push(...failures);
  }

  console.log(`\nConcluido: ${totalOk} imagem(ns) migrada(s), ${totalFailures.length} falha(s).`);
  process.exit(totalFailures.length > 0 ? 1 : 0);
}

main();

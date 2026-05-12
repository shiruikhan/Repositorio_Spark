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
const SERVICE_KEY  = (env["SUPABASE_SERVICE_ROLE_KEY"] || "").trim();

if (!SERVICE_KEY) {
  console.error("SUPABASE_SERVICE_ROLE_KEY nao encontrada no .env.local");
  process.exit(1);
}

console.log("Conectando em:", SUPABASE_URL);
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// Todos os 114 arquivos low-res deletados do banco
const filePaths = [
  "3125027/3125027_low_1778260116788_0.jpg",
  "3125027/3125027_low_1778260116788_1.jpg",
  "3125027/3125027_low_1778260116788_2.jpg",
  "3134027/3134027_low_1778607011473_0.jpg",
  "3134027/3134027_low_1778607011473_1.jpg",
  "3134027/3134027_low_1778607011473_2.jpg",
  "3134027/3134027_low_1778607011473_3.jpg",
  "3134027/3134027_low_1778607011473_4.jpg",
  "3134027/3134027_low_1778607011473_5.jpg",
  "312202/312202_low_1778608982478_0.jpg",
  "312202/312202_low_1778608982478_1.jpg",
  "312202/312202_low_1778608982478_2.jpg",
  "312202/312202_low_1778608982478_3.jpg",
  "312202/312202_low_1778608982478_4.jpg",
  "312202/312202_low_1778608982478_5.jpg",
  "312203/312203_low_1778609234236_0.jpg",
  "312203/312203_low_1778609234236_1.jpg",
  "312203/312203_low_1778609234236_2.jpg",
  "312203/312203_low_1778609234236_3.jpg",
  "312203/312203_low_1778609234236_4.jpg",
  "312203/312203_low_1778609234236_5.jpg",
  "312203/312203_low_1778609234236_6.jpg",
  "3134028/3134028_low_1778609841456_0.jpg",
  "3134028/3134028_low_1778609841456_1.jpg",
  "3134028/3134028_low_1778609841456_2.jpg",
  "3134028/3134028_low_1778609841456_3.jpg",
  "3134028/3134028_low_1778609841456_4.jpg",
  "3134028/3134028_low_1778609841456_5.jpg",
  "3134029/3134029_low_1778609888881_0.jpg",
  "3134029/3134029_low_1778609888881_1.jpg",
  "3134029/3134029_low_1778609888881_2.jpg",
  "3134029/3134029_low_1778609888881_3.jpg",
  "3134029/3134029_low_1778609888881_4.jpg",
  "3134029/3134029_low_1778609888881_5.jpg",
  "3134029/3134029_low_1778609888881_6.jpg",
  "3134030/3134030_low_1778609968353_0.jpg",
  "3134030/3134030_low_1778609968353_1.jpg",
  "3134030/3134030_low_1778609968353_2.jpg",
  "3134030/3134030_low_1778609968353_3.jpg",
  "3134030/3134030_low_1778609968353_4.jpg",
  "3134030/3134030_low_1778609968353_5.jpg",
  "3134013/3134013_low_1778610193319_0.jpg",
  "3134013/3134013_low_1778610193319_1.jpg",
  "3134013/3134013_low_1778610193319_2.jpg",
  "3134013/3134013_low_1778610193319_3.jpg",
  "3134013/3134013_low_1778610193319_4.jpg",
  "3134013/3134013_low_1778610193319_5.jpg",
  "3134014/3134014_low_1778610233430_0.jpg",
  "3134014/3134014_low_1778610233430_1.jpg",
  "3134014/3134014_low_1778610233430_2.jpg",
  "3134014/3134014_low_1778610233430_3.jpg",
  "3134014/3134014_low_1778610233430_4.jpg",
  "3134014/3134014_low_1778610233430_5.jpg",
  "3134015/3134015_low_1778610333887_0.jpg",
  "3134015/3134015_low_1778610333887_1.jpg",
  "3134015/3134015_low_1778610333887_2.jpg",
  "3134015/3134015_low_1778610333887_3.jpg",
  "3134015/3134015_low_1778610333887_4.jpg",
  "3134015/3134015_low_1778610333887_5.jpg",
  "3134016/3134016_low_1778610359768_0.jpg",
  "3134016/3134016_low_1778610359768_1.jpg",
  "3134016/3134016_low_1778610359768_2.jpg",
  "3134016/3134016_low_1778610359768_3.jpg",
  "3134016/3134016_low_1778610359768_4.jpg",
  "3134016/3134016_low_1778610359768_5.jpg",
  "3134017/3134017_low_1778610440574_0.jpg",
  "3134017/3134017_low_1778610440574_1.jpg",
  "3134017/3134017_low_1778610440574_2.jpg",
  "3134017/3134017_low_1778610440574_3.jpg",
  "3134017/3134017_low_1778610440574_4.jpg",
  "3134017/3134017_low_1778610440574_5.jpg",
  "3134018/3134018_low_1778610460511_0.jpg",
  "3134018/3134018_low_1778610460511_1.jpg",
  "3134018/3134018_low_1778610460511_2.jpg",
  "3134018/3134018_low_1778610460511_3.jpg",
  "3134018/3134018_low_1778610460511_4.jpg",
  "3134018/3134018_low_1778610460511_5.jpg",
  "3134031/3134031_low_1778610527887_0.jpg",
  "3134031/3134031_low_1778610527887_1.jpg",
  "3134031/3134031_low_1778610527887_2.jpg",
  "3134031/3134031_low_1778610527887_3.jpg",
  "3134031/3134031_low_1778610527887_4.jpg",
  "3134031/3134031_low_1778610527887_5.jpg",
  "3134032/3134032_low_1778610549551_0.jpg",
  "3134032/3134032_low_1778610549551_1.jpg",
  "3134032/3134032_low_1778610549551_2.jpg",
  "3134032/3134032_low_1778610549551_3.jpg",
  "3134032/3134032_low_1778610549551_4.jpg",
  "3134032/3134032_low_1778610549551_5.jpg",
  "311803/311803_low_1778610633429_0.jpg",
  "311803/311803_low_1778610633429_1.jpg",
  "311803/311803_low_1778610633429_2.jpg",
  "311803/311803_low_1778610633429_3.jpg",
  "311803/311803_low_1778610633429_4.jpg",
  "311803/311803_low_1778610633429_5.jpg",
  "311803/311803_low_1778610633429_6.jpg",
  "314903/314903_low_1778611334426_0.jpg",
  "314903/314903_low_1778611334426_1.jpg",
  "314903/314903_low_1778611334426_2.jpg",
  "314903/314903_low_1778611334426_3.jpg",
  "314903/314903_low_1778611334426_4.jpg",
  "314903/314903_low_1778611334426_5.jpg",
  "314905/314905_low_1778612008526_0.jpg",
  "314905/314905_low_1778612008526_1.jpg",
  "314905/314905_low_1778612008526_2.jpg",
  "314905/314905_low_1778612008526_3.jpg",
  "314905/314905_low_1778612008526_4.jpg",
  "314905/314905_low_1778612008526_5.jpg",
  "314906/314906_low_1778612030804_0.jpg",
  "314906/314906_low_1778612030804_1.jpg",
  "314906/314906_low_1778612030804_2.jpg",
  "314906/314906_low_1778612030804_3.jpg",
  "314906/314906_low_1778612030804_4.jpg",
  "314906/314906_low_1778612030804_5.jpg",
];

async function main() {
  console.log("Total de arquivos a deletar do storage: " + filePaths.length);

  // Deleta em lotes de 20 (limite do Supabase)
  const BATCH = 20;
  let deleted = 0, failed = 0;

  for (let i = 0; i < filePaths.length; i += BATCH) {
    const batch = filePaths.slice(i, i + BATCH);
    const { data, error } = await supabase.storage
      .from("product-assets")
      .remove(batch);

    if (error) {
      console.error("  ERRO no lote " + (i/BATCH + 1) + ": " + error.message);
      failed += batch.length;
    } else {
      deleted += batch.length;
      console.log("  Lote " + (i/BATCH + 1) + ": " + batch.length + " arquivos removidos");
    }
  }

  console.log("=".repeat(50));
  console.log("Resultado: " + deleted + " deletados | " + failed + " falhas");
  console.log("");
  console.log("Banco de dados ja foi limpo (114 registros deletados).");
  console.log("Agora faca o deploy e re-suba as imagens de baixa resolucao.");
}

main().catch(console.error);

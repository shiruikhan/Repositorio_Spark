import ApiTester from "./ApiTester";
import { createClient } from "@/lib/supabase/server";

const BASE = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

const CURL = (code: string) =>
  `curl -s "https://repositorio.spark.ind.br/api/products/${code}/images"`;

const CURL_WITH_KEY = (code: string) =>
  `curl -s "https://repositorio.spark.ind.br/api/products/${code}/images" \\\n  -H "X-API-Key: SUA_CHAVE_API"`;

const FETCH_JS = (code: string) => `const res = await fetch(
  "https://repositorio.spark.ind.br/api/products/${code}/images"
);
const { product_code, total, images } = await res.json();

// images[0].public_url  → link da imagem
// images[0].resolution_type → "high" | "low"`;

const SUPABASE_DIRECT = (code: string) =>
  `${BASE}/rest/v1/ext_product_images` +
  `?product_code=eq.${code}&select=id,resolution_type,position,public_url,created_at` +
  `\n\n# Header obrigatório:\napikey: ${ANON_KEY || "sua_anon_key"}`;

const EXAMPLE_RESPONSE = JSON.stringify(
  {
    product_code: "1234",
    total: 2,
    images: [
      {
        id: "uuid-1",
        resolution_type: "high",
        position: 0,
        public_url: "https://xxx.supabase.co/storage/v1/object/public/product-assets/1234/1234_high_1715000000_0.jpg",
        created_at: "2026-05-08T12:00:00.000Z",
      },
      {
        id: "uuid-2",
        resolution_type: "low",
        position: 0,
        public_url: "https://xxx.supabase.co/storage/v1/object/public/product-assets/1234/1234_low_1715000000_0.jpg",
        created_at: "2026-05-08T12:00:00.000Z",
      },
    ],
  },
  null,
  2
);

export default async function DocsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: keyRow } = await supabase
    .from("ext_api_keys")
    .select("api_key")
    .eq("user_id", user!.id)
    .maybeSingle();
  const userApiKey = keyRow?.api_key ?? null;

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Documentação da API
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Endpoint público para consulta de imagens de produtos pelo integrador.
        </p>
      </div>

      {/* API Key notice */}
      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 rounded-xl px-4 py-3 text-sm text-blue-800 dark:text-blue-300 flex items-start gap-3">
        <span className="text-lg leading-none mt-0.5">🔑</span>
        <div className="space-y-1">
          {userApiKey ? (
            <>
              <p className="font-semibold">Sua chave API</p>
              <code className="block text-xs font-mono bg-blue-100/60 dark:bg-blue-900/40 rounded px-2 py-1 break-all select-all">
                {userApiKey}
              </code>
              <p className="text-xs text-blue-600 dark:text-blue-400">
                Use no header <code className="font-mono">X-API-Key</code> ou como <code className="font-mono">apikey</code> no Supabase REST.{" "}
                <a href="/profile" className="underline hover:text-blue-800 dark:hover:text-blue-200">Gerenciar no perfil →</a>
              </p>
            </>
          ) : (
            <>
              <p className="font-semibold">Nenhuma chave API gerada</p>
              <p className="text-xs text-blue-600 dark:text-blue-400">
                Gere sua chave na{" "}
                <a href="/profile" className="underline hover:text-blue-800 dark:hover:text-blue-200">página de perfil</a>{" "}
                para usar nos exemplos abaixo e no Supabase REST.
              </p>
            </>
          )}
        </div>
      </div>

      {/* Endpoint spec */}
      <Section title="Endpoint">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded">
              GET
            </span>
            <code className="text-sm font-mono text-gray-800 dark:text-gray-200 break-all">
              /api/products/<span className="text-brand">{"{productCode}"}</span>/images
            </code>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Retorna todas as imagens de um produto em ordem de resolução e posição.
            Endpoint público — nenhuma autenticação necessária. O header <code className="font-mono text-xs">X-API-Key</code> é opcional e registra o uso da chave.
          </p>

          <table className="w-full text-xs border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <thead className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
              <tr>
                <th className="text-left px-3 py-2">Parâmetro</th>
                <th className="text-left px-3 py-2">Tipo</th>
                <th className="text-left px-3 py-2">Descrição</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              <tr>
                <td className="px-3 py-2 font-mono text-brand">productCode</td>
                <td className="px-3 py-2 text-gray-500 dark:text-gray-400">path param</td>
                <td className="px-3 py-2 text-gray-600 dark:text-gray-400">Código do produto (URL-encoded)</td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-mono text-brand">X-API-Key</td>
                <td className="px-3 py-2 text-gray-500 dark:text-gray-400">header (opcional)</td>
                <td className="px-3 py-2 text-gray-600 dark:text-gray-400">Chave API gerada no perfil</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      {/* Response schema */}
      <Section title="Resposta">
        <div className="space-y-3">
          <table className="w-full text-xs border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <thead className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
              <tr>
                <th className="text-left px-3 py-2">Campo</th>
                <th className="text-left px-3 py-2">Tipo</th>
                <th className="text-left px-3 py-2">Descrição</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-gray-700 dark:text-gray-300">
              {[
                ["product_code", "string", "Código do produto consultado"],
                ["total", "number", "Total de imagens encontradas"],
                ["images[].id", "string (uuid)", "Identificador único da imagem"],
                ["images[].resolution_type", '"high" | "low"', "Tipo de resolução"],
                ["images[].position", "number", "Ordem dentro do produto"],
                ["images[].public_url", "string", "URL pública permanente do arquivo"],
                ["images[].created_at", "ISO 8601", "Data de criação"],
              ].map(([field, type, desc]) => (
                <tr key={field}>
                  <td className="px-3 py-2 font-mono text-brand">{field}</td>
                  <td className="px-3 py-2 text-gray-500 dark:text-gray-400 font-mono">{type}</td>
                  <td className="px-3 py-2">{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <CodeBlock label="Exemplo de resposta" code={EXAMPLE_RESPONSE} lang="json" />
        </div>
      </Section>

      {/* Code examples */}
      <Section title="Exemplos de integração">
        <div className="space-y-4">
          <CodeBlock label="cURL (sem autenticação)" code={CURL("1234")} lang="bash" />
          <CodeBlock label="cURL (com chave API)" code={CURL_WITH_KEY("1234")} lang="bash" />
          <CodeBlock label="JavaScript / TypeScript" code={FETCH_JS("1234")} lang="js" />
          <CodeBlock
            label={`Supabase REST direto (apikey: ${userApiKey ? "sua chave" : "gere no perfil"})`}
            code={SUPABASE_DIRECT("1234")}
            lang="bash"
          />
        </div>
      </Section>

      {/* Live tester */}
      <Section title="Tester interativo">
        <ApiTester />
      </Section>

      {/* Notes */}
      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/50 rounded-xl px-4 py-3 text-xs text-amber-800 dark:text-amber-400 space-y-1">
        <p className="font-semibold">Notas importantes</p>
        <ul className="list-disc list-inside space-y-0.5 text-amber-700 dark:text-amber-400">
          <li>
            A <code className="font-mono">public_url</code> é a referência oficial e permanente para uso no marketplace.
          </li>
          <li>
            Imagens de <strong>alta resolução</strong> ({`"high"`}) são mantidas no original — use para listagem de produtos.
          </li>
          <li>
            Imagens de <strong>baixa resolução</strong> ({`"low"`}) são indicadas para miniaturas e pré-visualizações.
          </li>
          <li>Cache de 60 s no servidor, stale por até 5 min (CDN).</li>
        </ul>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 border-b border-gray-200 dark:border-gray-700 pb-2">
        {title}
      </h3>
      {children}
    </div>
  );
}

function CodeBlock({
  label,
  code,
  lang,
}: {
  label: string;
  code: string;
  lang: string;
}) {
  return (
    <div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
      <pre
        className={`bg-gray-900 text-sm rounded-xl p-4 overflow-auto font-mono leading-relaxed ${
          lang === "json" ? "text-green-300" : "text-blue-200"
        }`}
      >
        <code>{code}</code>
      </pre>
    </div>
  );
}

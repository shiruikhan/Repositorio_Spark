import UploadForm from "./UploadForm";

export default function UploadPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Upload de imagens</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Os arquivos serão renomeados automaticamente e armazenados no bucket{" "}
          <code className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-1 py-0.5 rounded">
            product-assets
          </code>
          .
        </p>
      </div>

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-6">
        <UploadForm />
      </div>

      {/* Naming convention info */}
      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 rounded-xl px-4 py-3 text-xs text-blue-700 dark:text-blue-400 space-y-1">
        <p className="font-semibold">Padrão de nomenclatura dos arquivos</p>
        <code className="block font-mono text-blue-800 dark:text-blue-300">
          {"{codigo}_{tipo}_{timestamp}_{posicao}.ext"}
        </code>
        <p className="text-blue-600 dark:text-blue-400">
          Exemplo:{" "}
          <code className="font-mono">1234_high_1715000000_0.jpg</code>
        </p>
      </div>
    </div>
  );
}

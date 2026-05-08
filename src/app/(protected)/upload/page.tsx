import UploadForm from "./UploadForm";

export default function UploadPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Upload de imagens</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Os arquivos serão renomeados automaticamente e armazenados no bucket{" "}
          <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">
            product-assets
          </code>
          .
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-6">
        <UploadForm />
      </div>

      {/* Naming convention info */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-700 space-y-1">
        <p className="font-semibold">Padrão de nomenclatura dos arquivos</p>
        <code className="block font-mono text-blue-800">
          {"{codigo}_{tipo}_{timestamp}_{posicao}.ext"}
        </code>
        <p className="text-blue-600">
          Exemplo:{" "}
          <code className="font-mono">1234_high_1715000000_0.jpg</code>
        </p>
      </div>
    </div>
  );
}

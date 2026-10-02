"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body style={{ fontFamily: "sans-serif", textAlign: "center", padding: "4rem 1rem" }}>
        <h2>Algo deu errado</h2>
        <p>Ocorreu um erro inesperado. Recarregue a página para tentar novamente.</p>
        <button type="button" onClick={() => window.location.reload()}>
          Recarregar
        </button>
      </body>
    </html>
  );
}

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Amostragem de performance: 10% das transações
  tracesSampleRate: 0.1,

  // Não enviar erros em desenvolvimento local
  environment: process.env.NODE_ENV,

  // Ignora erros de rede e cancelamentos do usuário
  ignoreErrors: [
    "ResizeObserver loop limit exceeded",
    "Network request failed",
    "Failed to fetch",
    "Load failed",
  ],
});

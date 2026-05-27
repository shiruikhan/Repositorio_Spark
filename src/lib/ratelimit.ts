/**
 * Rate limiter em memória — adequado para deploy single-instance (Hostinger Node.js).
 * Para multi-instância, substituir pelo @upstash/ratelimit com Redis.
 */

interface Entry {
  count: number;
  resetAt: number;
}

const store = new Map<string, Entry>();

// Limpa entradas expiradas a cada 5 minutos
const CLEANUP_INTERVAL = 5 * 60 * 1000;
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (now > entry.resetAt) store.delete(key);
    }
  }, CLEANUP_INTERVAL);
}

/**
 * Retorna `true` se a requisição é permitida, `false` se bloqueada.
 *
 * @param key      Identificador único (ex: "zip_192.168.1.1")
 * @param limit    Máximo de requisições por janela
 * @param windowMs Tamanho da janela em milissegundos
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): boolean {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= limit) return false;

  entry.count++;
  return true;
}

/** Extrai o IP real considerando proxies (Hostinger / Cloudflare). */
export function getClientIp(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    headers.get("x-real-ip") ??
    "anonymous"
  );
}

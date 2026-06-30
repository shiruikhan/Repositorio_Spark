/**
 * Remove caracteres que quebram o parser de filtros do PostgREST quando o
 * termo é interpolado em `.or("col.ilike.%term%,...")`. Vírgulas e parênteses
 * são separadores de sintaxe e permitiriam injetar operadores arbitrários.
 */
export function sanitizeSearch(q: string | undefined | null): string {
  return (q ?? "").replace(/[,()]/g, " ").replace(/\s+/g, " ").trim();
}

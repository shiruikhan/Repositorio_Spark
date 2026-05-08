import { createClient } from "@supabase/supabase-js";

// Usar apenas em Server Actions / Route Handlers — nunca expor ao cliente
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

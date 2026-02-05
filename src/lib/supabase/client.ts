import { createBrowserClient } from "@supabase/ssr";
import { checkCircuitOrThrow, CircuitBreakerError } from "./circuit-breaker";

let client: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  // Check circuit breaker to prevent infinite loops
  checkCircuitOrThrow("Supabase Client");

  if (client) return client;

  client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  return client;
}

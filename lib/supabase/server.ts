import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/** Supabase client for Server Components, Server Actions and Route Handlers (reads the session from cookies). */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll(toSet) {
        try { for (const { name, value, options } of toSet) cookieStore.set(name, value, options); }
        catch { /* called from a Server Component; proxy.ts refreshes the session instead */ }
      },
    },
  });
}

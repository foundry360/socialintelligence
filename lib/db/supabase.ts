// Placeholder for Supabase client helpers (Phase 1).
// Use service role only on the server; anon key + RLS for user-scoped access.

export function assertServerSideSupabaseConfig(): void {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error("Supabase URL/anon key not configured");
  }
}

import { NextResponse } from "next/server";
import { acceptPendingInvitesForUser } from "@/lib/tenancy/accept-invites";
import { createClient } from "@/lib/db/server";

function safeNextPath(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/workspace";
  }
  return next;
}

/** Exchange auth code for session (email confirm / magic link / password recovery). */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.email) {
        await acceptPendingInvitesForUser({
          userId: user.id,
          email: user.email,
        }).catch(() => undefined);
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}

import { redirect } from "next/navigation";
import { createClient } from "@/lib/db/server";
import { UpdatePasswordForm } from "./update-password-form";

export default async function UpdatePasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login/forgot?error=session");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-6 px-6 py-16">
      <div>
        <p className="text-sm text-muted">Social Intelligence</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Set your password
        </h1>
        <p className="mt-2 text-sm text-muted">
          Signed in as {user.email}. Choose a password to finish joining the workspace.
        </p>
      </div>
      <UpdatePasswordForm />
    </main>
  );
}

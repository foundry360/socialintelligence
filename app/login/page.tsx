import { Suspense } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="relative mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-6 px-6 py-16">
      <div className="absolute right-6 top-6">
        <ThemeToggle />
      </div>
      <div>
        <p className="text-sm text-muted">Social Intelligence</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Sign in</h1>
        <p className="mt-2 text-sm text-muted">
          Phase 1 platform spine - email/password sign in.
        </p>
      </div>
      <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>
        <LoginForm />
      </Suspense>
    </main>
  );
}

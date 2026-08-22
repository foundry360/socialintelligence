import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="relative mx-auto flex min-h-screen w-full max-w-[400px] flex-col justify-center gap-6 px-6 py-16">
      <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>
        <LoginForm />
      </Suspense>
    </main>
  );
}

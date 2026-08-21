import { ForgotPasswordForm } from "./forgot-password-form";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const sessionExpired = params.error === "session";

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-6 px-6 py-16">
      <div>
        <p className="text-sm text-muted">Social Intelligence</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Reset password
        </h1>
        <p className="mt-2 text-sm text-muted">
          Enter your account email. We’ll send a link to choose a new password.
        </p>
        {sessionExpired ? (
          <p className="mt-2 text-sm text-warning-text">
            Your reset session expired. Request a new link below.
          </p>
        ) : null}
      </div>
      <ForgotPasswordForm />
    </main>
  );
}

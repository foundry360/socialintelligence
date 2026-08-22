import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

export default function Home() {
  return (
    <main className="relative mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-4 px-6 py-16">
      <div className="absolute right-6 top-6">
        <ThemeToggle />
      </div>
      <p className="text-sm tracking-wide text-muted">Foundry360</p>
      <h1 className="text-3xl font-semibold tracking-tight text-foreground">
        Social Intelligence
      </h1>
      <p className="text-lg text-muted">
        Thought Leadership Intelligence OS - Phase 1 platform spine. Knowledge
        baseline before content generation.
      </p>
      <div className="flex gap-4 text-sm">
        <Link href="/login" className="underline">
          Sign in
        </Link>
        <Link href="/workspace" className="underline">
          Workspace
        </Link>
      </div>
    </main>
  );
}

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-4 px-6 py-16">
      <p className="text-sm tracking-wide text-zinc-500">Foundry360</p>
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
        Social Intelligence
      </h1>
      <p className="text-lg text-zinc-600">
        Thought Leadership Intelligence OS — Phase 0 foundation. See{" "}
        <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-sm">docs/</code>{" "}
        and <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-sm">AGENTS.md</code>.
      </p>
    </main>
  );
}

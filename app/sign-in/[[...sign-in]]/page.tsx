import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="grid min-h-screen bg-base text-copy-primary lg:grid-cols-2">
      <section className="hidden flex-col justify-between border-r border-surface-border bg-surface p-10 lg:flex">
        <div className="font-mono text-sm font-medium text-brand">Ghost AI</div>
        <div className="max-w-sm">
          <h1 className="text-3xl font-semibold">Design systems together.</h1>
          <ul className="mt-6 space-y-3 text-sm text-copy-secondary">
            <li>Map architecture on a shared canvas.</li>
            <li>Work with collaborators in real time.</li>
            <li>Turn diagrams into technical specifications.</li>
          </ul>
        </div>
        <p className="text-sm text-copy-muted">Collaborative system design workspace</p>
      </section>
      <section className="flex items-center justify-center p-6 sm:p-10">
        <SignIn />
      </section>
    </main>
  );
}

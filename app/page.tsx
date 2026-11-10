import Image from "next/image";

export default function Home() {
  const apiUrl = process.env.API_URL;
  const appEnv = process.env.APP_ENV;

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-between py-24 px-8 sm:px-16 bg-white dark:bg-black sm:items-start">
        <Image
          className="dark:invert h-5 w-[100px]"
          src="/next.svg"
          alt="Next.js logo"
          width={100}
          height={20}
          priority
        />

        <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left w-full my-10">
          <span className="inline-flex items-center rounded-full bg-emerald-100 dark:bg-emerald-950 px-3 py-1 text-xs font-medium text-emerald-800 dark:text-emerald-300">
            GitHub Actions + Docker + Fly.io
          </span>

          <h1 className="text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
            Exemplo prático de CI/CD no Front-end
          </h1>

          <p className="max-w-xl text-base leading-7 text-zinc-600 dark:text-zinc-400">
            Esta aplicação demonstra como configurar um pipeline enxuto no{" "}
            <code className="rounded bg-black/[.06] px-1.5 py-0.5 font-mono text-sm dark:bg-white/[.08]">
              GitHub Actions
            </code>{" "}
            usando <strong>GitHub Secrets</strong>, um <strong>Dockerfile</strong> multi-stage limpo e{" "}
            <strong>Workflows Reutilizáveis</strong> com deploy automatizado no <strong>Fly.io</strong>.
          </p>

          <div className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 p-5 text-left font-mono text-sm space-y-3">
            <div className="text-xs font-sans uppercase tracking-wider text-zinc-400">
              Variáveis de Ambiente Carregadas
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-zinc-200 dark:border-zinc-800 pb-2">
              <span className="text-zinc-500">APP_ENV:</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                {appEnv}
              </span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span className="text-zinc-500">API_URL:</span>
              <span className="font-semibold text-zinc-900 dark:text-zinc-100 break-all">
                {apiUrl}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 text-base font-medium sm:flex-row w-full sm:w-auto">
          <a
            className="flex h-12 w-full items-center justify-center rounded-full bg-foreground px-6 text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc] sm:w-auto"
            href="https://docs.github.com/pt/actions"
            target="_blank"
            rel="noopener noreferrer"
          >
            Documentação GitHub Actions
          </a>
        </div>
      </main>
    </div>
  );
}

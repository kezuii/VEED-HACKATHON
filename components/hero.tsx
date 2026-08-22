export function Hero() {
  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col items-center gap-6 px-6 py-24 text-center sm:py-32">
      <span className="rounded-full border border-black/[.08] px-3 py-1 text-xs font-medium uppercase tracking-wide text-zinc-600 dark:border-white/[.145] dark:text-zinc-400">
        Now in early access
      </span>
      <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-6xl">
        Ship your next idea faster
      </h1>
      <p className="max-w-xl text-lg leading-8 text-zinc-600 dark:text-zinc-400">
        A clean, ready-to-extend Next.js starter with a landing page, an
        organized project structure, and an API layer built in from day one.
      </p>
      <div className="flex flex-col gap-4 pt-2 text-base font-medium sm:flex-row">
        <a
          href="#contact"
          className="flex h-12 items-center justify-center rounded-full bg-foreground px-6 text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
        >
          Get started
        </a>
        <a
          href="#features"
          className="flex h-12 items-center justify-center rounded-full border border-solid border-black/[.08] px-6 transition-colors hover:border-transparent hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
        >
          Learn more
        </a>
      </div>
    </section>
  );
}

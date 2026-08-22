const features = [
  {
    title: "App Router structure",
    description:
      "Pages, layouts, and components are organized so new routes and sections are easy to add.",
  },
  {
    title: "Built-in API layer",
    description:
      "Route Handlers under app/api give you a typed, server-only place for backend logic.",
  },
  {
    title: "Styled with Tailwind",
    description:
      "Utility-first styling that supports light and dark mode out of the box.",
  },
];

export function Features() {
  return (
    <section
      id="features"
      className="mx-auto w-full max-w-6xl scroll-mt-16 px-6 py-16"
    >
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          Everything you need to start
        </h2>
        <p className="mt-3 text-base text-zinc-600 dark:text-zinc-400">
          A minimal foundation, not a framework of its own — extend any part
          of it.
        </p>
      </div>
      <div className="mt-12 grid gap-6 sm:grid-cols-3">
        {features.map((feature) => (
          <div
            key={feature.title}
            className="rounded-2xl border border-black/[.08] p-6 dark:border-white/[.145]"
          >
            <h3 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
              {feature.title}
            </h3>
            <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
              {feature.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

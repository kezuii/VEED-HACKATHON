import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-black/[.08] bg-white/80 backdrop-blur dark:border-white/[.145] dark:bg-black/80">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center px-6">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Veed Hack
        </Link>
      </div>
    </header>
  );
}

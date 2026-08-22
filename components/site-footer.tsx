export function SiteFooter() {
  return (
    <footer className="border-t border-black/[.08] dark:border-white/[.145]">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-center px-6 py-8 text-sm text-zinc-600 dark:text-zinc-400">
        <p>&copy; {new Date().getFullYear()} Veed Hack. All rights reserved.</p>
      </div>
    </footer>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-black/[.08] dark:border-white/[.145]">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-zinc-600 dark:text-zinc-400 sm:flex-row">
        <p>&copy; {new Date().getFullYear()} Veed Hack. All rights reserved.</p>
        <div className="flex gap-6">
          <a href="#features" className="hover:text-zinc-950 dark:hover:text-zinc-50">
            Features
          </a>
          <a href="#contact" className="hover:text-zinc-950 dark:hover:text-zinc-50">
            Contact
          </a>
        </div>
      </div>
    </footer>
  );
}

"use client";

import { usePathname } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

const NO_CHROME_PREFIXES = ["/test"];

export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideChrome = NO_CHROME_PREFIXES.some(
    (prefix) => pathname === prefix || pathname?.startsWith(`${prefix}/`)
  );

  if (hideChrome) {
    return <main className="flex flex-1 flex-col">{children}</main>;
  }

  return (
    <>
      <main className="flex flex-1 flex-col">{children}</main>
    </>
  );
}

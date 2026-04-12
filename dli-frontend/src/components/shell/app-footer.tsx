import Link from "next/link";

import { FOOTER_LINKS } from "@/config/constants";

export function AppFooter() {
  return (
    <footer className="border-t border-[color:var(--line)] px-4 py-6 sm:px-6 lg:px-10">
      <div className="flex flex-col gap-5 text-zinc-500/80 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.34em]">
            Copyright © F.A.S.T. SRM 2026
          </p>
          <p className="font-mono text-[10px] uppercase tracking-[0.28em]">
            Kattankulathur, Chennai, TN, India
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {FOOTER_LINKS.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              prefetch={true}
              className="font-mono text-[10px] uppercase tracking-[0.3em] transition hover:text-lime-300"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}

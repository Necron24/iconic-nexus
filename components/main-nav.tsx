"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const publicLinks = [
  ["/discover", "Discover"],
  ["/devlogs", "Devlogs"],
  ["/campaigns", "Campaigns"],
  ["/wall-of-fame", "Wall of Fame"]
] as const;

export function MainNav({ signedIn }: { signedIn: boolean }) {
  const pathname = usePathname();
  const links = signedIn ? [...publicLinks, ["/dashboard", "Dashboard"] as const, ["/help", "Help"] as const] : [...publicLinks, ["/help", "Help"] as const];

  return <nav className="hidden items-center gap-2 text-sm font-semibold lg:flex" aria-label="Main navigation">
    {links.map(([href, label]) => {
      const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`)) || (href === "/dashboard" && pathname.startsWith("/dashboard"));
      return <Link
        key={href}
        href={href}
        aria-current={active ? "page" : undefined}
        className={`relative rounded-xl px-3 py-2 transition ${active ? "bg-cyan/10 text-white shadow-[inset_0_0_0_1px_rgba(87,230,255,.28)]" : "text-soft hover:bg-white/5 hover:text-white"}`}
      >
        {label}
        {active && <span className="absolute inset-x-3 -bottom-[17px] h-0.5 rounded-full bg-cyan shadow-[0_0_12px_rgba(87,230,255,.9)]"/>}
      </Link>;
    })}
  </nav>;
}

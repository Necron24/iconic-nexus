"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  ["/dashboard", "Overview"],
  ["/dashboard/projects", "My projects"],
  ["/dashboard/content", "Content manager"],
  ["/dashboard/testing", "My testing"],
  ["/dashboard/analytics", "Analytics"],
  ["/dashboard/team", "Team"],
  ["/dashboard/subscription", "Plan"],
  ["/dashboard/credits", "Credits"],
  ["/dashboard/boosts", "Boosts"],
  ["/dashboard/notifications", "Notifications"],
  ["/dashboard/following", "Following"],
  ["/dashboard/saved", "Saved"],
  ["/dashboard/profile", "Profile"],
  ["/dashboard/account", "Account"],
  ["/help", "Help"]
] as const;

export function DashboardNav({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname();
  const visibleLinks = isAdmin ? [...links, ["/dashboard/admin", "Admin"] as const] : links;

  return (
    <div className="relative">
      <nav
        aria-label="Dashboard navigation"
        className="flex flex-wrap justify-center gap-2 rounded-[1.4rem] border border-white/10 bg-white/[0.055] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,.09),0_18px_60px_rgba(0,0,0,.18)] backdrop-blur-2xl"
      >
        {visibleLinks.map(([href, label]) => {
          const active = href === "/dashboard"
            ? pathname === href
            : pathname === href || pathname.startsWith(`${href}/`);

          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`shrink-0 snap-start rounded-2xl px-4 py-2.5 text-sm font-bold transition ${
                active
                  ? "border border-cyan/25 bg-cyan/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,.1),0_0_24px_rgba(74,222,255,.08)]"
                  : "border border-transparent text-soft hover:bg-white/[0.07] hover:text-white"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

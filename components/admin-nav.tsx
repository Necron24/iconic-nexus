"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, ShieldAlert, Star } from "lucide-react";

const links = [
  { href: "/dashboard/admin", label: "Overview", icon: BarChart3 },
  { href: "/dashboard/admin/reports", label: "Safety & reports", icon: ShieldAlert },
  { href: "/dashboard/admin/reviews", label: "Site reviews", icon: Star }
];

export function AdminNav() {
  const pathname = usePathname();
  return <nav aria-label="Admin navigation" className="mb-6 flex flex-wrap gap-2 rounded-2xl border border-red-300/20 bg-red-300/[.04] p-2">
    {links.map(({ href, label, icon: Icon }) => {
      const active = href === "/dashboard/admin" ? pathname === href : pathname.startsWith(href);
      return <Link key={href} href={href} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition ${active ? "bg-red-300 text-ink" : "text-red-100 hover:bg-white/10"}`}>
        <Icon size={16}/>{label}
      </Link>;
    })}
  </nav>;
}

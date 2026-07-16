import Link from "next/link";

export function DashboardNav() {
  const links = [
    ["/dashboard", "Overview"],
    ["/dashboard/projects", "My projects"],
    ["/dashboard/testing", "My testing"],
    ["/dashboard/analytics", "Analytics"],
    ["/dashboard/team", "Team"],
    ["/dashboard/subscription", "Plan"],
    ["/dashboard/credits", "Credits"],
    ["/dashboard/boosts", "Boosts"],
    ["/dashboard/notifications", "Notifications"],
    ["/dashboard/profile", "Profile"],
    ["/dashboard/account", "Account"],
    ["/help", "Help"]
  ];
  return <nav className="card flex flex-wrap gap-2 p-2">{links.map(([href,label]) => <Link key={href} href={href} className="rounded-lg px-4 py-2 text-sm font-semibold text-soft hover:bg-white/5 hover:text-white">{label}</Link>)}</nav>;
}

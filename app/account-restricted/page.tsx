import Link from "next/link";
export default async function AccountRestrictedPage({ searchParams }: { searchParams: Promise<{ reason?: string; status?: string }> }) {
  const p = await searchParams;
  return <section className="container-page grid min-h-[65vh] place-items-center py-14"><div className="card max-w-xl p-8 text-center"><p className="text-sm font-bold uppercase tracking-[.2em] text-red-300">Account restricted</p><h1 className="mt-3 text-4xl font-black">Your account is {p.status || "restricted"}</h1><p className="mt-4 leading-7 text-soft">{p.reason || "Access has been limited by the moderation team. Contact support if you believe this is a mistake."}</p><div className="mt-7 flex justify-center gap-3"><Link href="/contact" className="btn-primary">Contact support</Link><Link href="/community-guidelines" className="btn-secondary">View guidelines</Link></div></div></section>;
}

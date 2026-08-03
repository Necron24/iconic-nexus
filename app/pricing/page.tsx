import Link from "next/link";

export const metadata = { title: "Pricing | Iconic Nexus" };
const creditPacks = [["Starter", "100", "R49"], ["Builder", "250", "R99"], ["Studio", "600", "R199"], ["Power", "1,500", "R399"]];
const plans = [["Free", "R0", "1 active public campaign, 1 team seat and basic dashboard access."], ["Iconic Nexus Pro", "R99 / month", "Up to 5 active campaigns, private campaigns, advanced analytics and 100 monthly bonus credits."], ["Iconic Nexus Studio", "R249 / month", "Up to 20 active campaigns, 8 team seats, advanced analytics and 300 monthly bonus credits."]];

export default function PricingPage() {
  return (
    <section className="container-page py-14"><div className="mx-auto max-w-6xl">
      <div className="text-center"><p className="text-sm font-bold uppercase tracking-[.2em] text-cyan">Transparent pricing</p><h1 className="mt-2 text-4xl font-black">Iconic Nexus pricing</h1><p className="mx-auto mt-4 max-w-2xl leading-7 text-soft">All prices are displayed in South African rand. Payment is securely processed by Paystack.</p></div>
      <section className="mt-12"><h2 className="text-2xl font-black">One-time Nexus Credit packs</h2><p className="mt-2 text-soft">Credits can be used for testing campaigns and boosts. These purchases do not renew.</p><div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{creditPacks.map(([name, credits, price]) => <article className="card p-6" key={name}><p className="text-sm font-bold uppercase tracking-wider text-cyan">{name}</p><p className="mt-3 text-4xl font-black text-lime">{credits}</p><p className="text-sm text-soft">credits</p><p className="mt-4 text-2xl font-black">{price}</p></article>)}</div></section>
      <section className="mt-12"><h2 className="text-2xl font-black">Optional monthly plans</h2><p className="mt-2 text-soft">Paid plans renew monthly until cancelled. Cancel from Dashboard → Plan before the next renewal.</p><div className="mt-5 grid gap-5 md:grid-cols-3">{plans.map(([name, price, description]) => <article className="card p-6" key={name}><h3 className="text-xl font-black">{name}</h3><p className="mt-4 text-3xl font-black text-lime">{price}</p><p className="mt-4 leading-7 text-soft">{description}</p></article>)}</div></section>
      <div className="mt-10 flex flex-wrap justify-center gap-3"><Link href="/register" className="btn-primary">Create an account</Link><Link href="/refund-policy" className="btn-secondary">Refund Policy</Link><Link href="/cancellation-policy" className="btn-secondary">Cancellation Policy</Link></div>
    </div></section>
  );
}

import Link from "next/link";
import { Check, Circle, Rocket, X } from "lucide-react";

type ChecklistItem = {
  label: string;
  description: string;
  complete: boolean;
  href: string;
};

export function OnboardingChecklist({
  title,
  items
}: {
  title: string;
  items: ChecklistItem[];
}) {
  const completeCount = items.filter((item) => item.complete).length;
  if (completeCount === items.length) return null;
  const progress = Math.round((completeCount / items.length) * 100);

  return (
    <section className="card mb-6 overflow-hidden border-lime/20">
      <div className="border-b border-white/10 bg-gradient-to-r from-lime/[0.09] to-cyan/[0.04] p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-lime text-ink"><Rocket size={21}/></div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[.2em] text-lime">Getting started</p>
              <h2 className="mt-1 text-xl font-black">{title}</h2>
              <p className="mt-1 text-sm text-soft">{completeCount} of {items.length} steps complete</p>
            </div>
          </div>
          <Link href="/help" className="btn-secondary !px-4 !py-2">Open Help Centre</Link>
        </div>
        <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-lime transition-all" style={{ width: `${progress}%` }}/></div>
      </div>
      <div className="grid gap-2 p-4 md:grid-cols-2">
        {items.map((item) => (
          <Link key={item.label} href={item.href} className={`flex items-start gap-3 rounded-xl border p-4 transition ${item.complete ? "border-lime/15 bg-lime/[0.05]" : "border-white/10 bg-white/[0.025] hover:border-cyan/30 hover:bg-white/[0.05]"}`}>
            {item.complete ? <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-lime text-ink"><Check size={15}/></span> : <Circle className="mt-0.5 shrink-0 text-soft" size={24}/>} 
            <span><span className={`block font-bold ${item.complete ? "text-lime" : "text-white"}`}>{item.label}</span><span className="mt-1 block text-sm leading-6 text-soft">{item.description}</span></span>
          </Link>
        ))}
      </div>
    </section>
  );
}

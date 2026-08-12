"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { Handshake, ShieldCheck, TestTube2 } from "lucide-react";
import { acknowledgeCommunityPurpose } from "@/app/community-notice/actions";

export function CommunityPurposeNotice() {
  const [open, setOpen] = useState(true);
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [open]);

  if (!open) return null;
  const acknowledge = () => startTransition(async () => {
    setFailed(false);
    const result = await acknowledgeCommunityPurpose();
    if (result.ok) setOpen(false); else setFailed(true);
  });

  return <div className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-[#050914]/85 p-4 backdrop-blur-md" role="dialog" aria-modal="true" aria-labelledby="community-purpose-title">
    <div className="card w-full max-w-2xl overflow-hidden border-cyan/30 bg-[#10182a] shadow-[0_30px_100px_rgba(0,0,0,.65)]">
      <div className="border-b border-white/10 bg-gradient-to-r from-cyan/15 via-lime/10 to-transparent p-6 md:p-8">
        <div className="flex items-center gap-3 text-cyan"><Handshake size={28}/><p className="text-sm font-black uppercase tracking-[.2em]">Welcome to Iconic Nexus</p></div>
        <h2 id="community-purpose-title" className="mt-4 text-3xl font-black md:text-4xl">We make progress by helping each other.</h2>
        <p className="mt-4 text-base leading-7 text-soft">Iconic Nexus connects developers and testers so community members can test one another&apos;s projects, share honest feedback and help every project improve.</p>
      </div>
      <div className="p-6 md:p-8">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-lime/20 bg-lime/[.06] p-5"><TestTube2 className="text-lime"/><h3 className="mt-3 font-black">Test honestly</h3><p className="mt-2 text-sm leading-6 text-soft">Spend real time with projects and explain clearly what worked, what was confusing and what can improve.</p></div>
          <div className="rounded-2xl border border-cyan/20 bg-cyan/[.06] p-5"><ShieldCheck className="text-cyan"/><h3 className="mt-3 font-black">Build respectfully</h3><p className="mt-2 text-sm leading-6 text-soft">Give constructive feedback, reward valid testing and treat creators and testers fairly.</p></div>
        </div>
        <p className="mt-5 text-sm leading-6 text-soft">This is a collaborative platform—not a place for fake reviews, copied feedback, spam or abusive behaviour. Read the <Link href="/community-guidelines" className="font-bold text-cyan hover:text-white">Community Guidelines</Link> whenever you need more detail.</p>
        {failed && <p className="mt-4 rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">We could not save your acknowledgement. Please try again.</p>}
        <button type="button" onClick={acknowledge} disabled={pending} className="btn-primary mt-6 w-full disabled:cursor-wait disabled:opacity-70">{pending ? "Saving…" : "I understand — enter the Nexus"}</button>
      </div>
    </div>
  </div>;
}

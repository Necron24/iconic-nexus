"use client";

import { ArrowLeft, ArrowRight, Check, Coins, FolderPlus, HelpCircle, Rocket, TestTube2, X } from "lucide-react";
import { useState, useTransition } from "react";

const steps = [
  {
    icon: Rocket,
    title: "Welcome to Iconic Nexus",
    body: "This quick tour shows you where to discover projects, earn Nexus Credits and get your own app or game tested."
  },
  {
    icon: TestTube2,
    title: "Test other projects",
    body: "Browse Discover or Campaigns, join a test, log your sessions and submit useful feedback. Approved work earns credits."
  },
  {
    icon: Coins,
    title: "Use Nexus Credits",
    body: "Credits fund your campaigns. Rewards are reserved safely and are only paid after valid feedback is approved."
  },
  {
    icon: FolderPlus,
    title: "Publish your own project",
    body: "Create a listing, upload an icon, cover and screenshots, then launch a campaign to recruit testers."
  },
  {
    icon: HelpCircle,
    title: "Help is always available",
    body: "Open the Help Centre from the navigation whenever you need step-by-step guidance, safety information or answers."
  }
];

export function OnboardingTour({ completeAction }: { completeAction: () => Promise<void> }) {
  const [open, setOpen] = useState(true);
  const [step, setStep] = useState(0);
  const [pending, startTransition] = useTransition();
  const current = steps[step];
  const Icon = current.icon;

  const finish = () => {
    startTransition(async () => {
      await completeAction();
      setOpen(false);
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[110] grid place-items-center bg-black/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Iconic Nexus introduction">
      <div className="w-full max-w-xl overflow-hidden rounded-3xl border border-white/15 bg-[#121a2b] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <p className="text-sm font-bold uppercase tracking-[.2em] text-cyan">Getting started</p>
          <button onClick={finish} disabled={pending} type="button" className="grid h-9 w-9 place-items-center rounded-lg hover:bg-white/10" aria-label="Skip introduction"><X size={20}/></button>
        </div>
        <div className="p-7 sm:p-9">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-lime text-ink"><Icon size={30}/></div>
          <h2 className="mt-6 text-3xl font-black">{current.title}</h2>
          <p className="mt-4 text-lg leading-8 text-soft">{current.body}</p>
          <div className="mt-7 flex gap-2">{steps.map((_, index)=><span key={index} className={`h-2 flex-1 rounded-full ${index<=step?'bg-lime':'bg-white/10'}`}/>)}</div>
        </div>
        <div className="flex items-center justify-between border-t border-white/10 px-6 py-4">
          <button onClick={()=>setStep(v=>Math.max(0,v-1))} disabled={step===0||pending} className="btn-secondary gap-2 disabled:cursor-not-allowed disabled:opacity-40" type="button"><ArrowLeft size={17}/> Back</button>
          {step < steps.length-1 ? <button onClick={()=>setStep(v=>v+1)} className="btn-primary gap-2" type="button">Next <ArrowRight size={17}/></button> : <button onClick={finish} disabled={pending} className="btn-primary gap-2" type="button"><Check size={18}/>{pending?'Saving…':'Start using Iconic Nexus'}</button>}
        </div>
      </div>
    </div>
  );
}

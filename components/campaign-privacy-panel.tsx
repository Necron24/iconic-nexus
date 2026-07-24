"use client";

import { Check, Copy, LockKeyhole } from "lucide-react";
import { useState } from "react";

export function CampaignPrivacyPanel({ campaignId, accessCode }: { campaignId: string; accessCode: string }) {
  const [copied, setCopied] = useState(false);
  const invitePath = `/campaigns/${campaignId}?code=${encodeURIComponent(accessCode)}`;
  const copy = async () => {
    await navigator.clipboard.writeText(`${window.location.origin}${invitePath}`);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };
  return (
    <div className="card mb-6 border-cyan/30 bg-cyan/5 p-6">
      <div className="flex items-start gap-3">
        <LockKeyhole className="mt-0.5 text-cyan" />
        <div className="min-w-0 flex-1">
          <h3 className="text-xl font-black">Private campaign active</h3>
          <p className="mt-2 text-sm leading-6 text-soft">This campaign is hidden from the public feed. Send the private invite link only to testers you want to invite.</p>
          <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4">
            <p className="text-xs font-bold uppercase tracking-[.18em] text-soft">Access code</p>
            <p className="mt-1 font-mono text-2xl font-black tracking-[.22em] text-cyan">{accessCode}</p>
          </div>
          <button type="button" onClick={copy} className="btn-primary mt-4 gap-2">{copied ? <Check size={17}/> : <Copy size={17}/>} {copied ? "Invite link copied" : "Copy private invite link"}</button>
        </div>
      </div>
    </div>
  );
}

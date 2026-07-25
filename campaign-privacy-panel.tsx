"use client";

import { Check, Copy, Link2, LockKeyhole } from "lucide-react";
import { useState } from "react";
import { ShareButton } from "@/components/share-button";

type CopiedItem = "code" | "link" | null;

export function CampaignPrivacyPanel({
  campaignId,
  accessCode,
  campaignTitle = "Private campaign"
}: {
  campaignId: string;
  accessCode: string;
  campaignTitle?: string;
}) {
  const [copied, setCopied] = useState<CopiedItem>(null);
  const invitePath = `/campaigns/${campaignId}?code=${encodeURIComponent(accessCode)}`;

  const copyText = async (value: string, item: Exclude<CopiedItem, null>) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(item);
      window.setTimeout(() => setCopied(null), 1800);
    } catch {
      setCopied(null);
    }
  };

  const copyCode = () => copyText(accessCode, "code");
  const copyInviteLink = () => copyText(`${window.location.origin}${invitePath}`, "link");

  return (
    <div className="card mb-6 border-cyan/30 bg-cyan/5 p-6">
      <div className="flex items-start gap-3">
        <LockKeyhole className="mt-0.5 shrink-0 text-cyan" />
        <div className="min-w-0 flex-1">
          <h3 className="text-xl font-black">Private campaign active</h3>
          <p className="mt-2 text-sm leading-6 text-soft">
            This campaign is hidden from public discovery. Testers can either open the private invite link or enter the access code manually. Opening it does not join the campaign automatically; they must still press Join campaign.
          </p>

          <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4">
            <p className="text-xs font-bold uppercase tracking-[.18em] text-soft">Access code</p>
            <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="break-all font-mono text-2xl font-black tracking-[.22em] text-cyan">{accessCode}</p>
              <button type="button" onClick={copyCode} className="btn-secondary shrink-0 gap-2 !px-4 !py-2">
                {copied === "code" ? <Check size={17} /> : <Copy size={17} />}
                {copied === "code" ? "Code copied" : "Copy access code"}
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <ShareButton
              title={campaignTitle}
              text="You have been invited to a private Iconic Nexus testing campaign."
              path={invitePath}
              className="btn-primary gap-2"
            />
            <button type="button" onClick={copyInviteLink} className="btn-secondary gap-2">
              {copied === "link" ? <Check size={17} /> : <Link2 size={17} />}
              {copied === "link" ? "Invite link copied" : "Copy invite link"}
            </button>
          </div>

          <p className="mt-3 text-xs text-amber-100">
            The access code only unlocks the private campaign page. The tester is added only after pressing Join campaign.
          </p>
        </div>
      </div>
    </div>
  );
}

"use client";

import { KeyRound, LockKeyhole, X } from "lucide-react";
import { useState } from "react";

type Props = {
  action: (formData: FormData) => void | Promise<void>;
  pageAccessCode: string;
  signedIn: boolean;
};

export function PrivateCampaignJoinForm({ action, pageAccessCode, signedIn }: Props) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <div className="mt-6">
        <button type="button" onClick={() => setOpen(true)} className="btn-primary w-full">
          Join campaign
        </button>
        {!signedIn && (
          <p className="mt-3 text-center text-xs text-soft">
            You will be asked to log in before joining.
          </p>
        )}
      </div>
    );
  }

  return (
    <form action={action} className="mt-6 rounded-2xl border border-cyan/25 bg-cyan/5 p-4">
      <input type="hidden" name="pageAccessCode" value={pageAccessCode} />

      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-cyan/10 text-cyan">
            <LockKeyhole size={19} />
          </span>
          <div>
            <p className="font-bold text-white">Enter the private access code</p>
            <p className="mt-1 text-xs leading-5 text-soft">
              A correct code will join you to the campaign immediately.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-soft transition hover:bg-white/10 hover:text-white"
          aria-label="Cancel joining"
        >
          <X size={18} />
        </button>
      </div>

      <label className="mt-4 block">
        <span className="label">Access code *</span>
        <input
          name="accessCode"
          className="field text-center font-mono uppercase tracking-[.2em]"
          maxLength={16}
          autoComplete="off"
          placeholder="ACCESS CODE"
          required
          autoFocus
        />
      </label>

      <button type="submit" className="btn-primary mt-4 w-full gap-2">
        <KeyRound size={17} /> Verify code and join
      </button>

      {!signedIn && (
        <p className="mt-3 text-center text-xs text-soft">
          You will be asked to log in first, then returned to this campaign.
        </p>
      )}
    </form>
  );
}

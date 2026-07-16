"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AlertTriangle, Coins, ShieldCheck } from "lucide-react";

type Defaults = {
  title?: string;
  testerGoal?: number;
  durationDays?: number;
  minimumMinutes?: number;
  rewardCredits?: number;
  instructions?: string;
  status?: string;
};

type Props = {
  action: (formData: FormData) => void | Promise<void>;
  projectName: string;
  cancelHref: string;
  error?: string;
  defaults?: Defaults;
  submitLabel?: string;
  availableCredits: number;
  currentReserved?: number;
  spentCredits?: number;
};

function minimumReward(_minutes?: number, _duration?: number) {
  return 1;
}

export function CampaignForm({
  action,
  projectName,
  cancelHref,
  error,
  defaults,
  submitLabel = "Create campaign",
  availableCredits,
  currentReserved = 0,
  spentCredits = 0
}: Props) {
  const originalTesterGoal = defaults?.testerGoal ?? 12;
  const originalDurationDays = defaults?.durationDays ?? 14;
  const originalMinimumMinutes = defaults?.minimumMinutes ?? 15;
  const originalRewardCredits = defaults?.rewardCredits ?? 5;
  const originalRequiredReward = minimumReward(originalMinimumMinutes, originalDurationDays);

  const [testerGoal, setTesterGoal] = useState(originalTesterGoal);
  const [durationDays, setDurationDays] = useState(originalDurationDays);
  const [minimumMinutes, setMinimumMinutes] = useState(originalMinimumMinutes);
  const [rewardCredits, setRewardCredits] = useState(originalRewardCredits);

  const requiredReward = minimumReward(minimumMinutes, durationDays);
  const isLegacyCampaign = Boolean(defaults && originalRewardCredits < originalRequiredReward);
  const legacySettingsUnchanged =
    testerGoal === originalTesterGoal &&
    durationDays === originalDurationDays &&
    minimumMinutes === originalMinimumMinutes &&
    rewardCredits === originalRewardCredits;
  const legacyRewardAllowed = isLegacyCampaign && legacySettingsUnchanged;
  const rewardIsValid = rewardCredits >= requiredReward || legacyRewardAllowed;

  const budget = testerGoal * rewardCredits;
  const desiredRemaining = Math.max(0, budget - spentCredits);
  const extraRequired = Math.max(0, desiredRemaining - currentReserved);
  const refundEstimate = Math.max(0, currentReserved - desiredRemaining);
  const canAfford = extraRequired <= availableCredits;

  const budgetMessage = useMemo(() => {
    if (!defaults) return `${budget} credits will be reserved when this campaign is created.`;
    if (extraRequired > 0) return `${extraRequired} additional credits will be reserved when you save.`;
    if (refundEstimate > 0) return `${refundEstimate} credits will be returned to your available balance.`;
    return "The campaign budget will not change.";
  }, [budget, defaults, extraRequired, refundEstimate]);

  const legacyMessage = useMemo(() => {
    if (!isLegacyCampaign) return null;
    if (legacySettingsUnchanged) {
      return `This older campaign may keep its original ${originalRewardCredits}-credit reward while only the title or instructions are edited.`;
    }
    return `Because campaign requirements changed, the reward must now be at least ${requiredReward} credits per approved tester.`;
  }, [isLegacyCampaign, legacySettingsUnchanged, originalRewardCredits, requiredReward]);

  return (
    <form action={action} className="card space-y-6 p-6 md:p-8">
      {error && (
        <div className="rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <p className="text-xs font-bold uppercase tracking-[.2em] text-cyan">Project</p>
        <p className="mt-1 text-lg font-black">{projectName}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs text-soft">Available credits</p>
          <p className="mt-1 text-2xl font-black text-lime">{availableCredits}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs text-soft">Campaign budget</p>
          <p className="mt-1 text-2xl font-black">{budget}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs text-soft">Minimum reward</p>
          <p className="mt-1 text-2xl font-black text-cyan">{requiredReward}</p>
        </div>
      </div>

      {isLegacyCampaign && (
        <div className={`rounded-xl border p-4 ${legacySettingsUnchanged ? "border-amber-300/30 bg-amber-300/10" : "border-red-400/30 bg-red-400/10"}`}>
          <div className="flex items-start gap-3">
            <AlertTriangle className={`mt-0.5 ${legacySettingsUnchanged ? "text-amber-200" : "text-red-200"}`} size={20} />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-bold">Legacy campaign reward</p>
                <span className="badge border-amber-300/30 text-amber-100">{originalRewardCredits} credits</span>
              </div>
              <p className="mt-1 text-sm text-soft">{legacyMessage}</p>
            </div>
          </div>
        </div>
      )}

      <div className={`rounded-xl border p-4 ${canAfford && rewardIsValid ? "border-lime/25 bg-lime/5" : "border-red-400/30 bg-red-400/10"}`}>
        <div className="flex items-start gap-3">
          {canAfford && rewardIsValid ? (
            <ShieldCheck className="mt-0.5 text-lime" size={20} />
          ) : (
            <Coins className="mt-0.5 text-red-200" size={20} />
          )}
          <div>
            <p className="font-bold">
              {!rewardIsValid ? "Reward is below the required minimum" : canAfford ? "Campaign budget covered" : "Not enough Nexus Credits"}
            </p>
            <p className="mt-1 text-sm text-soft">{budgetMessage}</p>
            {!rewardIsValid && (
              <p className="mt-2 text-sm text-red-200">
                Set the reward to at least {requiredReward} credits, or restore all original legacy settings.
              </p>
            )}
            {rewardIsValid && !canAfford && (
              <p className="mt-2 text-sm text-red-200">You need {extraRequired - availableCredits} more credits.</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="sm:col-span-2">
          <span className="label">Campaign title *</span>
          <input
            name="title"
            className="field"
            maxLength={120}
            required
            defaultValue={defaults?.title}
            placeholder={`${projectName} Closed Test`}
          />
        </label>

        <label>
          <span className="label">Testers needed *</span>
          <input
            name="testerGoal"
            type="number"
            min={1}
            max={500}
            value={testerGoal}
            onChange={(event) => setTesterGoal(Number(event.target.value) || 1)}
            className="field"
            required
          />
        </label>

        <label>
          <span className="label">Campaign duration *</span>
          <select
            name="durationDays"
            className="field"
            value={durationDays}
            onChange={(event) => setDurationDays(Number(event.target.value))}
            required
          >
            {[3, 7, 14, 21, 30, 60, 90].map((days) => <option key={days} value={days}>{days} days</option>)}
          </select>
        </label>

        <label>
          <span className="label">Minimum testing time *</span>
          <select
            name="minimumMinutes"
            className="field"
            value={minimumMinutes}
            onChange={(event) => setMinimumMinutes(Number(event.target.value))}
            required
          >
            {[5, 10, 15, 30, 60, 120].map((minutes) => <option key={minutes} value={minutes}>{minutes} minutes</option>)}
          </select>
        </label>

        <label>
          <span className="label">Reward per approved tester *</span>
          <input
            name="rewardCredits"
            type="number"
            min={1}
            max={1000}
            value={rewardCredits}
            onChange={(event) => setRewardCredits(Number(event.target.value) || 1)}
            className="field"
            required
          />
          <span className="mt-2 block text-xs text-soft">
            Choose any whole-number reward from 1 to 1000 credits per approved tester.
          </span>
        </label>

        <label className="sm:col-span-2">
          <span className="label">Testing instructions *</span>
          <textarea
            name="instructions"
            className="field min-h-48 resize-y"
            maxLength={5000}
            required
            defaultValue={defaults?.instructions}
            placeholder="Explain what testers must install, which features they should try, how often they should test, and what feedback you need."
          />
        </label>
      </div>

      {!defaults && (
        <label className="flex items-start gap-3 rounded-xl border border-lime/20 bg-lime/5 p-4">
          <input name="startNow" type="checkbox" value="true" defaultChecked className="mt-1 h-4 w-4 accent-lime" />
          <span>
            <strong className="block">Start this campaign immediately</strong>
            <span className="mt-1 block text-sm text-soft">Turn this off to save it as a funded draft.</span>
          </span>
        </label>
      )}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Link href={cancelHref} className="btn-secondary">Cancel</Link>
        <button type="submit" disabled={!canAfford || !rewardIsValid} className="btn-primary disabled:cursor-not-allowed disabled:opacity-40">
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
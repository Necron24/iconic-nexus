import { SubmitButton } from "@/components/submit-button";
import { Clock3 } from "lucide-react";

type Props = {
  action: (formData: FormData) => void | Promise<void>;
  error?: string;
};

export function TestSessionForm({ action, error }: Props) {
  return (
    <form action={action} className="card p-6">
      <div className="flex items-center gap-3">
        <Clock3 className="text-cyan" />
        <div>
          <h2 className="text-2xl font-black">Log a test session</h2>
          <p className="mt-1 text-sm text-soft">Add every real session you complete.</p>
        </div>
      </div>
      {error && <div className="mt-5 rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-200">{error}</div>}
      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <label>
          <span className="label">Minutes tested *</span>
          <input name="minutesTested" type="number" min={1} max={600} className="field" required />
        </label>
        <label>
          <span className="label">Device *</span>
          <input name="deviceName" className="field" maxLength={120} placeholder="Samsung Galaxy A14" required />
        </label>
        <label>
          <span className="label">OS version</span>
          <input name="osVersion" className="field" maxLength={80} placeholder="Android 14" />
        </label>
        <label className="sm:col-span-2">
          <span className="label">Session notes</span>
          <textarea name="notes" className="field min-h-28 resize-y" maxLength={1500} placeholder="What did you test during this session?" />
        </label>
      </div>
      <SubmitButton className="btn-primary mt-6" idleText="Save session" pendingText="Saving session…" />
    </form>
  );
}

import { Send } from "lucide-react";

type Props = {
  action: (formData: FormData) => void | Promise<void>;
  totalMinutes: number;
  minimumMinutes: number;
  error?: string;
};

export function FeedbackForm({ action, totalMinutes, minimumMinutes, error }: Props) {
  const ready = totalMinutes >= minimumMinutes;
  return (
    <form action={action} className="card p-6">
      <div className="flex items-center gap-3">
        <Send className="text-lime" />
        <div>
          <h2 className="text-2xl font-black">Submit final feedback</h2>
          <p className="mt-1 text-sm text-soft">Be specific, honest and useful.</p>
        </div>
      </div>
      {!ready && <div className="mt-5 rounded-xl border border-amber-300/30 bg-amber-300/10 p-4 text-sm text-amber-100">You have logged {totalMinutes} of the required {minimumMinutes} minutes.</div>}
      {error && <div className="mt-5 rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-200">{error}</div>}
      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <label>
          <span className="label">Did installation succeed? *</span>
          <select name="installationSuccess" className="field" required defaultValue="true"><option value="true">Yes</option><option value="false">No</option></select>
        </label>
        <label>
          <span className="label">Did the app/game crash? *</span>
          <select name="crashFound" className="field" required defaultValue="false"><option value="false">No</option><option value="true">Yes</option></select>
        </label>
        <label>
          <span className="label">Bug severity *</span>
          <select name="severity" className="field" required defaultValue="none"><option value="none">None</option><option value="minor">Minor</option><option value="major">Major</option><option value="critical">Critical</option></select>
        </label>
        {[["performanceRating","Performance"],["stabilityRating","Stability"],["usabilityRating","Ease of use"],["overallRating","Overall experience"]].map(([name,label]) => (
          <label key={name}><span className="label">{label} *</span><select name={name} className="field" required defaultValue="5"><option value="5">5 - Excellent</option><option value="4">4 - Good</option><option value="3">3 - Average</option><option value="2">2 - Poor</option><option value="1">1 - Very poor</option></select></label>
        ))}
        <label className="sm:col-span-2"><span className="label">What worked well? *</span><textarea name="whatWorked" className="field min-h-32 resize-y" maxLength={3000} required /></label>
        <label className="sm:col-span-2"><span className="label">What was confusing or difficult? *</span><textarea name="whatWasConfusing" className="field min-h-32 resize-y" maxLength={3000} required /></label>
        <label className="sm:col-span-2"><span className="label">Bug details</span><textarea name="bugDetails" className="field min-h-32 resize-y" maxLength={4000} placeholder="Steps to reproduce, expected result and actual result." /></label>
        <label className="sm:col-span-2"><span className="label">Screenshots (optional, max 5)</span><input name="attachments" type="file" accept="image/png,image/jpeg,image/webp" multiple className="field" /></label>
      </div>
      <button type="submit" disabled={!ready} className="btn-primary mt-6 gap-2 disabled:cursor-not-allowed disabled:opacity-40"><Send size={17} /> Submit feedback</button>
    </form>
  );
}

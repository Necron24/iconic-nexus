import Link from "next/link";
import { SubmitButton } from "@/components/submit-button";

type UpdateValues = {
  title?: string;
  body?: string;
  version_label?: string | null;
  update_type?: string;
  image_url?: string | null;
  release_url?: string | null;
  is_published?: boolean;
};

export function UpdateForm({
  action,
  values = {},
  submitLabel,
  cancelHref
}: {
  action: (formData: FormData) => void | Promise<void>;
  values?: UpdateValues;
  submitLabel: string;
  cancelHref: string;
}) {
  return (
    <form action={action} className="card space-y-5 p-6">
      <div>
        <label className="mb-2 block text-sm font-bold" htmlFor="title">Update title</label>
        <input id="title" name="title" className="field" maxLength={120} required defaultValue={values.title ?? ""} placeholder="Kasi Runner v0.2 is live" />
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-bold" htmlFor="updateType">Update type</label>
          <select id="updateType" name="updateType" className="field" defaultValue={values.update_type ?? "development"}>
            <option value="development">Development update</option>
            <option value="release">New release</option>
            <option value="bug_fixes">Bug fixes</option>
            <option value="testing_needed">Testing needed</option>
            <option value="major_update">Major update</option>
            <option value="announcement">Announcement</option>
          </select>
        </div>
        <div>
          <label className="mb-2 block text-sm font-bold" htmlFor="versionLabel">Version (optional)</label>
          <input id="versionLabel" name="versionLabel" className="field" maxLength={40} defaultValue={values.version_label ?? ""} placeholder="v0.2.0" />
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-bold" htmlFor="body">Devlog</label>
        <textarea id="body" name="body" className="field min-h-56" minLength={10} maxLength={10000} required defaultValue={values.body ?? ""} placeholder="Explain what changed, what still needs work, and what feedback you need." />
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-bold" htmlFor="imageUrl">Image URL (optional)</label>
          <input id="imageUrl" name="imageUrl" type="url" className="field" defaultValue={values.image_url ?? ""} placeholder="https://..." />
        </div>
        <div>
          <label className="mb-2 block text-sm font-bold" htmlFor="releaseUrl">Release/download URL (optional)</label>
          <input id="releaseUrl" name="releaseUrl" type="url" className="field" defaultValue={values.release_url ?? ""} placeholder="https://..." />
        </div>
      </div>

      <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <input name="isPublished" type="checkbox" value="true" defaultChecked={values.is_published ?? true} className="h-4 w-4" />
        <span><span className="block font-bold">Publish this update</span><span className="text-sm text-soft">Uncheck to save it privately as a draft.</span></span>
      </label>

      <div className="flex flex-wrap gap-3">
        <SubmitButton idleText={submitLabel} pendingText="Publishing update…" />
        <Link href={cancelHref} className="btn-secondary">Cancel</Link>
      </div>
    </form>
  );
}

"use client";

import { Archive, ArchiveRestore, Trash2 } from "lucide-react";
import type { ManagedContentType } from "@/app/dashboard/content/actions";

export function ContentManagementActions({
  contentType,
  contentId,
  archived,
  archiveAction,
  restoreAction,
  deleteAction
}: {
  contentType: ManagedContentType;
  contentId: string;
  archived: boolean;
  archiveAction: (contentType: ManagedContentType, contentId: string) => Promise<void>;
  restoreAction: (contentType: ManagedContentType, contentId: string) => Promise<void>;
  deleteAction: (contentType: ManagedContentType, contentId: string) => Promise<void>;
}) {
  const label = contentType === "devlog" ? "devlog" : contentType;

  return (
    <div className="flex flex-wrap gap-2">
      <form action={archived ? restoreAction.bind(null, contentType, contentId) : archiveAction.bind(null, contentType, contentId)}>
        <button type="submit" className="btn-secondary !px-3 !py-2 gap-2">
          {archived ? <ArchiveRestore size={15} /> : <Archive size={15} />}
          {archived ? "Restore" : "Archive"}
        </button>
      </form>
      <form
        action={deleteAction.bind(null, contentType, contentId)}
        onSubmit={(event) => {
          if (!window.confirm(`Permanently delete this ${label}? This cannot be undone. Archive it instead if you may need it later.`)) {
            event.preventDefault();
          }
        }}
      >
        <button type="submit" className="rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm font-bold text-red-200 transition hover:bg-red-400/20">
          <span className="inline-flex items-center gap-2"><Trash2 size={15} />Delete</span>
        </button>
      </form>
    </div>
  );
}

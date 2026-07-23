import { LoaderCircle } from "lucide-react";

export function PageLoading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="container-page py-10" role="status" aria-live="polite">
      <div className="mb-6 flex items-center gap-3 text-soft">
        <LoaderCircle className="animate-spin text-cyan" size={22} />
        <span>{label}</span>
      </div>
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="card overflow-hidden p-0">
            <div className="h-40 animate-pulse bg-white/[0.07]" />
            <div className="space-y-3 p-5">
              <div className="h-5 w-2/3 animate-pulse rounded bg-white/10" />
              <div className="h-4 w-full animate-pulse rounded bg-white/[0.07]" />
              <div className="h-4 w-4/5 animate-pulse rounded bg-white/[0.07]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

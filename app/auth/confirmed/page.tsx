import Link from "next/link";
import { BadgeCheck } from "lucide-react";

function safeNext(next?: string) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

export default async function AccountConfirmedPage({
  searchParams
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const destination = safeNext(next);

  return (
    <section className="container-page grid min-h-[70vh] place-items-center py-14">
      <div className="card w-full max-w-lg p-8 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-lime text-ink">
          <BadgeCheck size={30} />
        </div>
        <h1 className="mt-5 text-3xl font-black">Account confirmed</h1>
        <p className="mt-4 leading-7 text-soft">
          Your email address has been verified successfully. Your Iconic Nexus account is ready.
        </p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href={destination} className="btn-primary">Continue to Iconic Nexus</Link>
          <Link href="/login" className="btn-secondary">Go to login</Link>
        </div>
      </div>
    </section>
  );
}

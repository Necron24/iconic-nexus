import Link from "next/link";
import { BadgeCheck, ShieldCheck } from "lucide-react";
import { confirmAccount } from "./actions";

export default async function ConfirmAccountPage({
  searchParams
}: {
  searchParams: Promise<{ token_hash?: string; type?: string; next?: string }>;
}) {
  const { token_hash: tokenHash, type = "signup", next = "/dashboard" } = await searchParams;
  const validLink = Boolean(tokenHash);

  return (
    <section className="container-page grid min-h-[70vh] place-items-center py-14">
      <div className="card w-full max-w-lg p-8 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-lime text-ink">
          {validLink ? <BadgeCheck size={30} /> : <ShieldCheck size={28} />}
        </div>

        <h1 className="mt-5 text-3xl font-black">
          {validLink ? "Confirm your Iconic Nexus account" : "Confirmation link unavailable"}
        </h1>

        <p className="mt-4 leading-7 text-soft">
          {validLink
            ? "Click the button below to verify your email address and activate your account."
            : "This confirmation link is incomplete. Request a fresh confirmation email or return to login."}
        </p>

        {validLink ? (
          <form action={confirmAccount} className="mt-7">
            <input type="hidden" name="token_hash" value={tokenHash} />
            <input type="hidden" name="type" value={type} />
            <input type="hidden" name="next" value={next} />
            <button type="submit" className="btn-primary w-full sm:w-auto">
              Confirm my account
            </button>
          </form>
        ) : (
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/register" className="btn-primary">Register again</Link>
            <Link href="/login" className="btn-secondary">Return to login</Link>
          </div>
        )}

        {validLink && (
          <p className="mt-5 text-xs leading-5 text-soft">
            This extra confirmation step prevents email security scanners from using your single-use verification link before you do.
          </p>
        )}
      </div>
    </section>
  );
}

import Link from "next/link";
import { MailCheck } from "lucide-react";

export default async function CheckEmailPage({
  searchParams
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  return (
    <section className="container-page grid min-h-[70vh] place-items-center py-14">
      <div className="card w-full max-w-lg p-8 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-lime text-ink">
          <MailCheck size={28} />
        </div>
        <h1 className="mt-5 text-3xl font-black">Check your email</h1>
        <p className="mt-4 leading-7 text-soft">
          We sent a confirmation link{email ? <> to <strong className="text-white">{email}</strong></> : null}. Open it to activate your Iconic Nexus account.
        </p>
        <p className="mt-3 text-sm text-soft">Check your spam or junk folder too.</p>
        <Link href="/login" className="btn-secondary mt-7">Back to login</Link>
      </div>
    </section>
  );
}

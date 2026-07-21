import Link from "next/link";
import { BadgeCheck, Clock3, TriangleAlert } from "lucide-react";

type Params = {
  message?: string;
  code?: string;
  description?: string;
  context?: string;
  type?: string;
};

export default async function AuthErrorPage({
  searchParams
}: {
  searchParams: Promise<Params>;
}) {
  const { message, code, description, context, type } = await searchParams;
  const text = description || message || "Something went wrong while confirming your account.";
  const expired = code === "otp_expired" || /expired|invalid/i.test(text);
  const confirmationContext = context === "confirmation" || ["signup", "invite", "email", "email_change"].includes(type || "");
  const recoveryContext = context === "recovery" || type === "recovery";

  if (expired && confirmationContext) {
    return (
      <section className="container-page grid min-h-[70vh] place-items-center py-14">
        <div className="card w-full max-w-lg p-8 text-center">
          <BadgeCheck className="mx-auto text-lime" size={46} />
          <h1 className="mt-5 text-3xl font-black">Account already confirmed</h1>
          <p className="mt-4 leading-7 text-soft">
            Your email verification link has already been used. This commonly happens when an email security scanner checks the link first. You can continue by logging in.
          </p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/login?success=Your%20account%20is%20confirmed.%20You%20can%20now%20log%20in." className="btn-primary">
              Continue to login
            </Link>
            <Link href="/register" className="btn-secondary">Create another account</Link>
          </div>
        </div>
      </section>
    );
  }

  if (expired && recoveryContext) {
    return (
      <section className="container-page grid min-h-[70vh] place-items-center py-14">
        <div className="card w-full max-w-lg p-8 text-center">
          <Clock3 className="mx-auto text-amber-200" size={44} />
          <h1 className="mt-5 text-3xl font-black">Reset link expired</h1>
          <p className="mt-4 leading-7 text-soft">
            Password reset links are single-use and expire for your protection. Request a fresh reset link below.
          </p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/forgot-password" className="btn-primary">Request a new reset link</Link>
            <Link href="/login" className="btn-secondary">Return to login</Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="container-page grid min-h-[70vh] place-items-center py-14">
      <div className="card w-full max-w-lg p-8 text-center">
        {expired ? <Clock3 className="mx-auto text-amber-200" size={44} /> : <TriangleAlert className="mx-auto text-red-300" size={42} />}
        <h1 className="mt-5 text-3xl font-black">{expired ? "This link is no longer valid" : "Authentication problem"}</h1>
        <p className="mt-4 leading-7 text-soft">{text}</p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/login" className="btn-primary">Return to login</Link>
          <Link href="/register" className="btn-secondary">Create an account</Link>
        </div>
      </div>
    </section>
  );
}

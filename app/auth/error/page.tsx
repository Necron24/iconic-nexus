import Link from "next/link";
import { Clock3, TriangleAlert } from "lucide-react";

export default async function AuthErrorPage({
  searchParams
}: {
  searchParams: Promise<{ message?: string; code?: string; description?: string }>;
}) {
  const { message, code, description } = await searchParams;
  const text = description || message || "Something went wrong while confirming your account.";
  const expired = code === "otp_expired" || /expired|invalid/i.test(text);

  return (
    <section className="container-page grid min-h-[70vh] place-items-center py-14">
      <div className="card w-full max-w-lg p-8 text-center">
        {expired ? <Clock3 className="mx-auto text-amber-200" size={44} /> : <TriangleAlert className="mx-auto text-red-300" size={42} />}
        <h1 className="mt-5 text-3xl font-black">{expired ? "This link has expired" : "Authentication problem"}</h1>
        <p className="mt-4 leading-7 text-soft">{expired ? "Email security links are single-use and expire for your protection. Request a fresh link below." : text}</p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          {expired && <Link href="/forgot-password" className="btn-primary">Request a new reset link</Link>}
          <Link href="/login" className="btn-secondary">Return to login</Link>
        </div>
      </div>
    </section>
  );
}

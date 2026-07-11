import Link from "next/link";
import { requestPasswordReset } from "@/app/auth/actions";

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  const params = await searchParams;
  return <section className="container-page grid min-h-[70vh] place-items-center py-14"><div className="card w-full max-w-md p-7">
    <p className="text-sm font-bold uppercase tracking-[.25em] text-cyan">Account recovery</p>
    <h1 className="mt-2 text-3xl font-black">Reset your password</h1>
    <p className="mt-3 text-sm leading-6 text-soft">Enter your account email and we will send you a secure reset link.</p>
    {params.error && <div className="mt-5 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">{params.error}</div>}
    {params.success && <div className="mt-5 rounded-xl border border-lime/30 bg-lime/10 px-4 py-3 text-sm text-lime">{params.success}</div>}
    <form action={requestPasswordReset} className="mt-7 space-y-5"><label><span className="label">Email address</span><input name="email" type="email" autoComplete="email" required className="field" placeholder="you@example.com" /></label><button className="btn-primary w-full">Send reset link</button></form>
    <p className="mt-6 text-center text-sm text-soft"><Link href="/login" className="font-bold text-lime">Back to login</Link></p>
  </div></section>;
}

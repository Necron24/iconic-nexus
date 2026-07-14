import Link from "next/link";
import { updatePassword } from "@/app/auth/actions";
import { PasswordPairFields } from "@/components/password-field";

export default async function UpdatePasswordPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  return (
    <section className="container-page grid min-h-[70vh] place-items-center py-14">
      <div className="card w-full max-w-md p-7">
        <p className="text-sm font-bold uppercase tracking-[.25em] text-cyan">Secure your account</p>
        <h1 className="mt-2 text-3xl font-black">Choose a new password</h1>
        <p className="mt-3 text-sm leading-6 text-soft">Use a unique password that you do not use on another website.</p>
        {params.error && <div className="mt-5 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">{params.error}</div>}
        <form action={updatePassword} className="mt-7 space-y-5">
          <PasswordPairFields passwordLabel="New password" confirmLabel="Confirm new password" />
          <button className="btn-primary w-full">Update password</button>
        </form>
        <p className="mt-6 text-center text-sm text-soft"><Link href="/forgot-password" className="font-bold text-cyan">Request another reset link</Link></p>
      </div>
    </section>
  );
}

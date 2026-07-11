import { updatePassword } from "@/app/auth/actions";
export default async function UpdatePasswordPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  return <section className="container-page grid min-h-[70vh] place-items-center py-14"><div className="card w-full max-w-md p-7">
    <p className="text-sm font-bold uppercase tracking-[.25em] text-cyan">Secure your account</p><h1 className="mt-2 text-3xl font-black">Choose a new password</h1>
    {params.error && <div className="mt-5 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">{params.error}</div>}
    <form action={updatePassword} className="mt-7 space-y-5"><label><span className="label">New password</span><input name="password" type="password" minLength={8} required className="field" autoComplete="new-password" /></label><label><span className="label">Confirm password</span><input name="confirmPassword" type="password" minLength={8} required className="field" autoComplete="new-password" /></label><button className="btn-primary w-full">Update password</button></form>
  </div></section>;
}

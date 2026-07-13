import Link from "next/link";
import { login } from "@/app/auth/actions";
import { TurnstileWidget } from "@/components/turnstile-widget";

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const params = await searchParams;

  return (
    <section className="container-page grid min-h-[70vh] place-items-center py-14">
      <div className="card w-full max-w-md p-7">
        <p className="text-sm font-bold uppercase tracking-[.25em] text-cyan">Welcome back</p>
        <h1 className="mt-2 text-3xl font-black">Log in to Iconic Nexus</h1>

        {params.error && (
          <div className="mt-5 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">
            {params.error}
          </div>
        )}
        {params.success && (
          <div className="mt-5 rounded-xl border border-lime/30 bg-lime/10 px-4 py-3 text-sm text-lime">
            {params.success}
          </div>
        )}

        <form action={login} className="mt-7 space-y-5">
          <label>
            <span className="label">Email address</span>
            <input name="email" type="email" autoComplete="email" required className="field" placeholder="you@example.com" />
          </label>
          <label>
            <span className="label">Password</span>
            <input name="password" type="password" autoComplete="current-password" required className="field" placeholder="••••••••" />
          </label>
          <div className="flex justify-end"><Link href="/forgot-password" className="text-sm font-semibold text-cyan hover:text-white">Forgot password?</Link></div>
          <TurnstileWidget action="login" /><button className="btn-primary w-full" type="submit">Log in</button>
        </form>

        <p className="mt-6 text-center text-sm text-soft">
          New here? <Link href="/register" className="font-bold text-lime">Create an account</Link>
        </p>
      </div>
    </section>
  );
}

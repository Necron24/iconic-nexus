import Link from "next/link";
import { register } from "@/app/auth/actions";

export default async function RegisterPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <section className="container-page grid min-h-[70vh] place-items-center py-14">
      <div className="card w-full max-w-2xl p-7">
        <p className="text-sm font-bold uppercase tracking-[.25em] text-cyan">Join the Nexus</p>
        <h1 className="mt-2 text-3xl font-black">Create your account</h1>
        <p className="mt-2 text-sm text-soft">Start with 50 Nexus Credits after registration.</p>

        {params.error && (
          <div className="mt-5 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">
            {params.error}
          </div>
        )}

        <form action={register} className="mt-7 grid gap-5 sm:grid-cols-2">
          <label>
            <span className="label">Username</span>
            <input name="username" required minLength={3} maxLength={30} pattern="[A-Za-z0-9_]+" className="field" placeholder="your_username" />
          </label>
          <label>
            <span className="label">Display name</span>
            <input name="displayName" className="field" placeholder="Your public name" />
          </label>
          <label>
            <span className="label">Country</span>
            <input name="country" className="field" defaultValue="South Africa" />
          </label>
          <label>
            <span className="label">I am joining as</span>
            <select name="role" className="field" defaultValue="both">
              <option value="both">Tester and developer</option>
              <option value="tester">Tester</option>
              <option value="developer">Developer</option>
            </select>
          </label>
          <label className="sm:col-span-2">
            <span className="label">Email address</span>
            <input name="email" type="email" autoComplete="email" required className="field" placeholder="you@example.com" />
          </label>
          <label>
            <span className="label">Password</span>
            <input name="password" type="password" autoComplete="new-password" required minLength={8} className="field" placeholder="At least 8 characters" />
          </label>
          <label>
            <span className="label">Confirm password</span>
            <input name="confirmPassword" type="password" autoComplete="new-password" required minLength={8} className="field" placeholder="Repeat your password" />
          </label>
          <label className="flex items-start gap-3 text-sm text-soft sm:col-span-2">
            <input name="acceptedTerms" value="true" type="checkbox" required className="mt-1 h-4 w-4" />
            <span>I agree to the <a href="/terms" className="font-bold text-lime">Terms</a>, <a href="/privacy" className="font-bold text-lime">Privacy Policy</a> and <a href="/community-guidelines" className="font-bold text-lime">Community Guidelines</a>.</span>
          </label>
          <button className="btn-primary sm:col-span-2" type="submit">Create account</button>
        </form>

        <p className="mt-6 text-center text-sm text-soft">
          Already registered? <Link href="/login" className="font-bold text-lime">Log in</Link>
        </p>
      </div>
    </section>
  );
}

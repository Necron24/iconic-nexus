import Link from "next/link";

export const metadata = { title: "Cancellation Policy | Iconic Nexus" };

export default function CancellationPolicyPage() {
  return (
    <section className="container-page py-14"><article className="card mx-auto max-w-4xl p-7 md:p-10">
      <p className="text-sm font-bold uppercase tracking-[.2em] text-cyan">Last updated: 3 August 2026</p>
      <h1 className="mt-2 text-4xl font-black">Cancellation Policy</h1>
      <div className="mt-7 space-y-7 leading-8 text-soft">
        <section><h2 className="text-xl font-black text-white">Monthly subscriptions</h2><p className="mt-2">Iconic Nexus Pro and Studio subscriptions renew monthly until cancelled. You may cancel at any time from Dashboard → Plan by selecting “Cancel subscription”. Cancellation stops the next automatic renewal. Your paid features normally remain available until the end of the current paid billing period.</p></section>
        <section><h2 className="text-xl font-black text-white">When cancellation takes effect</h2><p className="mt-2">A cancellation is effective when it is confirmed on your Plan page. Cancelling does not ordinarily refund the current billing period or reverse benefits already used. After the paid period ends, the account returns to the Free plan and the Free plan limits apply.</p></section>
        <section><h2 className="text-xl font-black text-white">Credit packs and boosts</h2><p className="mt-2">Credit-pack purchases are one-time payments and do not renew, so there is no recurring service to cancel. A boost begins when activated and cannot ordinarily be cancelled for a refund after placement has started. Unused campaign credits are handled according to the applicable campaign rules and our Refund Policy.</p></section>
        <section><h2 className="text-xl font-black text-white">Problems cancelling</h2><p className="mt-2">If the cancellation control is unavailable or you are charged after a confirmed cancellation, email <a href="mailto:iconicalapps@outlook.com" className="font-bold text-lime">iconicalapps@outlook.com</a> with your account email and payment reference. We will investigate and correct an incorrect renewal.</p></section>
        <section><h2 className="text-xl font-black text-white">Related policy</h2><p className="mt-2">Refund eligibility, payment errors and processing times are explained in our <Link href="/refund-policy" className="font-bold text-lime">Refund Policy</Link>. This policy does not limit rights that cannot lawfully be excluded under South African consumer law.</p></section>
      </div>
    </article></section>
  );
}

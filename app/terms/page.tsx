import Link from "next/link";

export const metadata = { title: "Terms of Service | Iconic Nexus" };

export default function TermsPage() {
  return (
    <section className="container-page py-14">
      <article className="card mx-auto max-w-4xl p-7 md:p-10">
        <p className="text-sm font-bold uppercase tracking-[.2em] text-cyan">Last updated: 30 July 2026</p>
        <h1 className="mt-2 text-4xl font-black">Terms of Service</h1>
        <div className="mt-7 space-y-7 leading-8 text-soft">
          <section><h2 className="text-xl font-black text-white">1. The service</h2><p className="mt-2">Iconic Nexus is a South African online platform where creators publish apps and games, recruit testers, share development updates, purchase internal credits and use optional paid subscriptions and sponsored placement.</p></section>
          <section><h2 className="text-xl font-black text-white">2. Accounts and age</h2><p className="mt-2">You must provide accurate information, keep your login secure and be legally able to enter into this agreement. You are responsible for activity performed through your account. Contact support promptly if you suspect unauthorised access.</p></section>
          <section><h2 className="text-xl font-black text-white">3. Creator content</h2><p className="mt-2">You retain ownership of content you submit, but grant Iconic Nexus a non-exclusive licence to host, display and distribute it as needed to operate and promote the service. You may only upload content you own or have permission to distribute.</p></section>
          <section><h2 className="text-xl font-black text-white">4. Testing and community conduct</h2><p className="mt-2">Testing must be genuine. Fake installs, bots, copied feedback, review manipulation, malware, harassment, illegal content and attempts to bypass platform security are prohibited. Developers may not reject useful negative feedback merely to avoid paying a reward. Moderators may review disputes and reverse abusive transactions.</p></section>
          <section><h2 className="text-xl font-black text-white">5. Nexus Credits</h2><p className="mt-2">Nexus Credits are internal platform units with no cash value. They cannot be withdrawn, transferred for money or sold outside Iconic Nexus. Purchased credits may be used for testing campaigns and sponsored placement. Credits received through rewards or promotions are not refundable for cash.</p></section>
          <section><h2 className="text-xl font-black text-white">6. Payments and subscriptions</h2><p className="mt-2">Prices are displayed in South African rand before checkout. Payments are processed securely by Paystack. Paid subscriptions renew monthly until cancelled. You can cancel from your Plan page; access continues until the current paid period ends unless a refund or legal requirement results in earlier termination.</p></section>
          <section><h2 className="text-xl font-black text-white">7. Sponsored placement</h2><p className="mt-2">Boosts provide clearly labelled, time-limited placement. They do not guarantee impressions, clicks, testers, sales or ranking outcomes and do not influence Wall of Fame results.</p></section>
          <section><h2 className="text-xl font-black text-white">8. Refunds</h2><p className="mt-2">Refunds and reversals are handled according to our <Link href="/refund-policy" className="font-bold text-lime">Refund and Cancellation Policy</Link> and applicable South African law. Where a payment is refunded, associated credits, subscription benefits or bonuses may be reversed.</p></section>
          <section><h2 className="text-xl font-black text-white">9. Moderation and availability</h2><p className="mt-2">We may remove content, restrict accounts or suspend access when reasonably necessary for safety, legal compliance or platform integrity. The service is supplied as available. Creators remain responsible for their own products, downloads, store requirements and legal compliance.</p></section>
          <section><h2 className="text-xl font-black text-white">10. Contact and governing law</h2><p className="mt-2">These terms are governed by South African law. Questions or disputes should first be sent to <a href="mailto:iconicalapps@outlook.com" className="font-bold text-lime">iconicalapps@outlook.com</a> so that we can attempt to resolve them promptly.</p></section>
        </div>
      </article>
    </section>
  );
}

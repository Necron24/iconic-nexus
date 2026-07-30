export const metadata = { title: "Privacy Policy | Iconic Nexus" };

export default function PrivacyPage() {
  return (
    <section className="container-page py-14">
      <article className="card mx-auto max-w-4xl p-7 md:p-10">
        <p className="text-sm font-bold uppercase tracking-[.2em] text-cyan">Last updated: 30 July 2026</p>
        <h1 className="mt-2 text-4xl font-black">Privacy Policy</h1>
        <div className="mt-7 space-y-7 leading-8 text-soft">
          <section><h2 className="text-xl font-black text-white">Who is responsible</h2><p className="mt-2">Iconic Nexus is the responsible party for personal information processed through this platform. Privacy requests can be sent to <a href="mailto:iconicalapps@outlook.com" className="font-bold text-lime">iconicalapps@outlook.com</a>.</p></section>
          <section><h2 className="text-xl font-black text-white">Information we process</h2><p className="mt-2">We process account and contact details, profile information, project listings, testing activity, feedback, uploads, purchases, subscriptions, credits, support messages and security logs. Paystack processes payment-card and banking information; Iconic Nexus does not store full card details.</p></section>
          <section><h2 className="text-xl font-black text-white">Why we use it</h2><p className="mt-2">Information is used to provide accounts, publish creator content, coordinate tests, process payments, operate credits and subscriptions, prevent abuse, resolve disputes, provide support, comply with law and improve the service. We do not sell personal information.</p></section>
          <section><h2 className="text-xl font-black text-white">Public information</h2><p className="mt-2">Public profiles, published projects, devlogs, campaigns and community contributions can be seen by other users and visitors. Email addresses, authentication details and private campaign information are not intentionally displayed publicly.</p></section>
          <section><h2 className="text-xl font-black text-white">Analytics</h2><p className="mt-2">We record privacy-conscious events such as content impressions, views, clicks, follows and campaign joins. Anonymous visitors receive a random browser identifier that is hashed and rotated daily. Analytics is used for creator reporting, boost performance and service improvement.</p></section>
          <section><h2 className="text-xl font-black text-white">Service providers and transfers</h2><p className="mt-2">Supabase provides database, authentication and file storage; Vercel provides website hosting; and Paystack processes payments. These providers may process information in other countries subject to their safeguards and applicable data-protection requirements.</p></section>
          <section><h2 className="text-xl font-black text-white">Retention and security</h2><p className="mt-2">We keep information only as long as reasonably necessary for the service, legal obligations, fraud prevention and dispute handling. Reasonable technical and organisational safeguards are used, but no online system can guarantee absolute security.</p></section>
          <section><h2 className="text-xl font-black text-white">Your rights</h2><p className="mt-2">Subject to POPIA and other applicable law, you may request access, correction or deletion of personal information, object to certain processing or complain to South Africa&apos;s Information Regulator. Some records may be retained where required for legal, payment, safety or fraud-prevention purposes.</p></section>
          <section><h2 className="text-xl font-black text-white">Changes</h2><p className="mt-2">This policy may be updated as Iconic Nexus develops. Material changes will be announced through the service or other appropriate channels.</p></section>
        </div>
      </article>
    </section>
  );
}

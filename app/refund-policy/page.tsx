export const metadata = { title: "Refund and Cancellation Policy | Iconic Nexus" };

export default function RefundPolicyPage() {
  return (
    <section className="container-page py-14">
      <article className="card mx-auto max-w-4xl p-7 md:p-10">
        <p className="text-sm font-bold uppercase tracking-[.2em] text-cyan">Last updated: 30 July 2026</p>
        <h1 className="mt-2 text-4xl font-black">Refund and Cancellation Policy</h1>
        <div className="mt-7 space-y-7 leading-8 text-soft">
          <section><h2 className="text-xl font-black text-white">Credit packs</h2><p className="mt-2">If a payment succeeds but credits are not delivered, contact us and we will investigate, deliver the missing credits or refund the affected payment. Duplicate or incorrect charges will be corrected. Refund requests for unused purchased credits should be submitted within seven days of purchase. Credits already spent, reserved or used for a boost are ordinarily not refundable unless required by law or caused by a platform error.</p></section>
          <section><h2 className="text-xl font-black text-white">Subscriptions</h2><p className="mt-2">Subscriptions renew monthly. You can cancel from Dashboard → Plan at any time. Cancellation normally prevents the next renewal while paid access continues until the current period ends. If an incorrect renewal occurs after a valid cancellation, contact us for correction.</p></section>
          <section><h2 className="text-xl font-black text-white">Boosts and campaign credits</h2><p className="mt-2">A boost starts immediately after activation and is normally non-refundable once placement begins. Completing or cancelling a testing campaign returns its unused reserved Nexus Credits automatically; rewards already earned by testers are not reversed.</p></section>
          <section><h2 className="text-xl font-black text-white">Refund effects and timing</h2><p className="mt-2">A refunded payment may reverse the associated credits, subscription access and bonus credits. Approved refunds are sent through the original payment method. Bank and payment-provider processing times may apply.</p></section>
          <section><h2 className="text-xl font-black text-white">How to request help</h2><p className="mt-2">Email <a href="mailto:iconicalapps@outlook.com" className="font-bold text-lime">iconicalapps@outlook.com</a> with your account email, payment date, amount and Paystack reference. This policy does not limit rights that cannot lawfully be excluded under South African consumer law.</p></section>
        </div>
      </article>
    </section>
  );
}

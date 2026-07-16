import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
export default function PaymentReturnPage() { return <div className="mx-auto max-w-2xl card p-8 text-center"><CheckCircle2 className="mx-auto text-lime" size={50}/><h1 className="mt-4 text-3xl font-black">Payment received for processing</h1><p className="mt-3 text-soft">PayFast will confirm the payment securely. Your credits appear automatically once the confirmation reaches Iconic Nexus.</p><Link className="btn-primary mt-6" href="/dashboard/credits">View credit balance</Link></div>; }

import Link from "next/link";
import { XCircle } from "lucide-react";
export default function PaymentCancelledPage() { return <div className="mx-auto max-w-2xl card p-8 text-center"><XCircle className="mx-auto text-cyan" size={50}/><h1 className="mt-4 text-3xl font-black">Payment cancelled</h1><p className="mt-3 text-soft">No credits were added and you have not been charged by Iconic Nexus.</p><Link className="btn-primary mt-6" href="/dashboard/credits">Return to credits</Link></div>; }

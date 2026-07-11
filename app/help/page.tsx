import Link from "next/link";
import { BookOpen, Bug, Coins, FolderPlus, HelpCircle, MessageSquareText, ShieldCheck, TestTube2 } from "lucide-react";

const sections = [
  { icon: FolderPlus, title: "Create and publish a project", body: "Open Dashboard → My projects → Add project. Add clear details, a working test link, an icon, a cover and useful screenshots before publishing." },
  { icon: TestTube2, title: "Join a testing campaign", body: "Browse Campaigns, open a campaign and join it. Follow the creator's instructions, use the app or game properly and log honest testing sessions." },
  { icon: MessageSquareText, title: "Submit useful feedback", body: "Explain what worked, what was confusing and exactly how to reproduce bugs. Screenshots and device details make reports much more useful." },
  { icon: Coins, title: "How Nexus Credits work", body: "You earn credits when your feedback is approved. Developers reserve credits before campaigns start, and unused campaign credits are refunded." },
  { icon: ShieldCheck, title: "Stay safe", body: "Only open links you trust. Never share passwords, payment details or private keys. Report suspicious projects, users or feedback immediately." },
  { icon: Bug, title: "Problems and disputes", body: "Use the Report page for abuse, scams, invalid feedback or payment disputes. Include enough detail for an administrator to review the issue fairly." }
];

export default function HelpPage() {
  return <section className="container-page py-14">
    <div className="mx-auto max-w-4xl">
      <div className="text-center"><span className="badge border-cyan/30 text-cyan"><HelpCircle size={14}/> Help Centre</span><h1 className="mt-5 text-4xl font-black md:text-6xl">Everything you need to use Iconic Nexus</h1><p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-soft">Learn where to find projects, how testing works, how credits are protected and what to do when something goes wrong.</p></div>
      <div className="mt-12 grid gap-5 md:grid-cols-2">{sections.map(({icon:Icon,title,body})=><article key={title} className="card p-6"><div className="grid h-11 w-11 place-items-center rounded-xl bg-lime text-ink"><Icon size={22}/></div><h2 className="mt-4 text-xl font-black">{title}</h2><p className="mt-3 leading-7 text-soft">{body}</p></article>)}</div>
      <div className="card mt-8 p-7"><div className="flex items-start gap-4"><BookOpen className="mt-1 shrink-0 text-cyan"/><div><h2 className="text-2xl font-black">Quick start checklist</h2><ol className="mt-4 space-y-3 text-soft"><li>1. Complete your profile and choose your page colours.</li><li>2. Browse Discover and test at least one project.</li><li>3. Earn Nexus Credits through approved feedback.</li><li>4. Publish your own project and create a testing campaign.</li><li>5. Review feedback fairly and report abuse when necessary.</li></ol></div></div></div>
      <div className="mt-8 flex flex-wrap justify-center gap-3"><Link href="/discover" className="btn-primary">Discover projects</Link><Link href="/dashboard/profile" className="btn-secondary">Customize profile</Link><Link href="/contact" className="btn-secondary">Contact support</Link></div>
    </div>
  </section>;
}

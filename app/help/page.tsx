import Link from "next/link";
import {
  Bell,
  BookOpen,
  Bug,
  CheckCircle2,
  Coins,
  FolderPlus,
  HelpCircle,
  MessageSquareText,
  Rocket,
  ShieldCheck,
  Star,
  TestTube2,
  UserRound
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { restartOnboarding } from "@/app/dashboard/onboarding/actions";

const sections = [
  { id: "getting-started", icon: Rocket, title: "Getting started", body: "Confirm your email, complete your profile and choose whether you mainly test, publish, or do both. Your dashboard checklist tracks the next useful steps.", steps: ["Open Dashboard → Profile and complete your public details.", "Use the first-login tour to learn where each area is.", "Return to Dashboard → Overview to see your progress checklist."] },
  { id: "testing", icon: TestTube2, title: "For testers", body: "Campaigns are active testing opportunities. Read the instructions and reward before joining, log the required testing time, then submit specific and honest feedback.", steps: ["Campaigns → choose an active campaign.", "Dashboard → My testing → start and log sessions.", "Submit feedback and respond to requested changes."] },
  { id: "projects", icon: FolderPlus, title: "Projects and publishing", body: "My projects contains your app and game listings. An Unpublished badge means only you can manage the project; publish it before public discovery and campaign visibility.", steps: ["Dashboard → My projects → Add project.", "Upload a clear icon, cover and screenshots.", "Edit the project and enable publishing when it is ready."] },
  { id: "campaigns", icon: Coins, title: "Campaigns and credits", body: "Creators set tester goals, minimum testing time and rewards. Campaign rewards are reserved so valid testers can be paid after approval.", steps: ["Create a campaign from the relevant project.", "Keep requirements objective and easy to verify.", "Track joins and submissions from campaign management."] },
  { id: "feedback-reviews", icon: MessageSquareText, title: "Feedback and reviews", body: "Creators can approve and award valid feedback, request specific changes, or report a genuinely invalid test. Useful negative feedback may not be rejected simply because the creator dislikes it.", steps: ["Approve valid work and release the reward.", "Request changes only for missing or unclear requirements.", "Use Report invalid test for spam, copied work, fake evidence or requirements that were not followed."] },
  { id: "reputation", icon: Star, title: "Reputation", body: "Approved useful testing builds tester reputation. Fair and timely campaign management builds developer reputation. Ratings for projects remain separate from user reputation.", steps: ["Keep feedback factual and reproducible.", "Review submissions consistently and before their deadline.", "Use the Wall of Fame to discover trusted contributors."] },
  { id: "notifications", icon: Bell, title: "Notifications", body: "The bell shows joins, feedback submissions, change requests, approvals and rewards. Opening a notification marks that item as read and reduces the unread counter.", steps: ["Use the bell for recent activity.", "Open Dashboard → Notifications for the full history.", "Use Mark read when you want to clear all unread items."] },
  { id: "safety", icon: ShieldCheck, title: "Safety and disputes", body: "Do not share passwords, payment details or private keys. Invalid-test reports and disputes should include evidence so administrators can review both sides fairly.", steps: ["Report suspicious projects, links, users or feedback.", "Campaign rewards remain protected while a dispute is reviewed.", "Repeated abuse can reduce reputation and lead to account action."] }
];

export default async function HelpPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return <section className="container-page py-14">
    <div className="mx-auto max-w-5xl">
      <div className="text-center">
        <span className="badge border-cyan/30 text-cyan"><HelpCircle size={14}/> Help Centre</span>
        <h1 className="mt-5 text-4xl font-black md:text-6xl">Know exactly where everything is</h1>
        <p className="mx-auto mt-5 max-w-3xl text-lg leading-8 text-soft">Follow the tester or creator workflow, understand credits and reputation, and see what happens when feedback needs review.</p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link href="/campaigns" className="btn-primary">Browse campaigns</Link>
          {user ? <Link href="/dashboard" className="btn-secondary">Open dashboard</Link> : <Link href="/register" className="btn-secondary">Create account</Link>}
          {user && <form action={restartOnboarding}><button className="btn-secondary" type="submit">Restart guided tour</button></form>}
        </div>
      </div>

      <nav className="card mt-10 flex flex-wrap justify-center gap-2 p-4" aria-label="Help topics">
        {sections.map((section) => <a key={section.id} href={`#${section.id}`} className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm font-bold text-soft transition hover:border-cyan/30 hover:text-white">{section.title}</a>)}
      </nav>

      <div className="mt-8 grid gap-5 md:grid-cols-2">
        {sections.map(({ id, icon: Icon, title, body, steps }) => <article id={id} key={id} className="card scroll-mt-28 p-6">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-lime text-ink"><Icon size={22}/></div>
          <h2 className="mt-4 text-xl font-black">{title}</h2>
          <p className="mt-3 leading-7 text-soft">{body}</p>
          <div className="mt-5 space-y-3">{steps.map((step) => <div key={step} className="flex gap-3 text-sm leading-6 text-soft"><CheckCircle2 className="mt-0.5 shrink-0 text-cyan" size={17}/><span>{step}</span></div>)}</div>
        </article>)}
      </div>

      <div className="card mt-8 p-7">
        <div className="flex items-start gap-4"><BookOpen className="mt-1 shrink-0 text-cyan"/><div><h2 className="text-2xl font-black">The complete workflow</h2><div className="mt-4 grid gap-5 md:grid-cols-2"><div><p className="font-bold text-lime">Tester</p><p className="mt-2 leading-7 text-soft">Campaigns → Join → My testing → Log sessions → Submit feedback → Changes if needed → Approval → Credits and reputation.</p></div><div><p className="font-bold text-cyan">Creator</p><p className="mt-2 leading-7 text-soft">My projects → Publish → Create campaign → Testers join → Review feedback → Approve, request changes or report invalid work.</p></div></div></div></div>
      </div>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/discover" className="btn-primary">Discover projects</Link>
        {user && <Link href="/dashboard/profile" className="btn-secondary"><UserRound size={16}/> Customize profile</Link>}
        <Link href="/contact" className="btn-secondary"><Bug size={16}/> Contact support</Link>
      </div>
    </div>
  </section>;
}

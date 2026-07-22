"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  Check,
  Coins,
  Compass,
  FolderPlus,
  HelpCircle,
  LayoutDashboard,
  ShieldCheck,
  TestTube2,
  Trophy,
  UserRound,
  X
} from "lucide-react";
import { useMemo, useState, useTransition } from "react";

type OnboardingRole = "tester" | "developer" | "both";

type TourStep = {
  icon: typeof Compass;
  title: string;
  body: string;
  location: string;
  href?: string;
  linkLabel?: string;
};

const commonSteps: TourStep[] = [
  {
    icon: LayoutDashboard,
    title: "Your dashboard is your control centre",
    body: "The dashboard shows your credits, projects, testing activity, reputation, unread notifications and the next actions that need your attention.",
    location: "Dashboard → Overview",
    href: "/dashboard",
    linkLabel: "Open dashboard"
  },
  {
    icon: Bell,
    title: "Notifications keep work moving",
    body: "Open the bell to see joins, submissions, change requests, approvals and rewards. Opening a notification marks it as read and takes you to the relevant page.",
    location: "Top navigation → Bell, or Dashboard → Notifications",
    href: "/dashboard/notifications",
    linkLabel: "Open notifications"
  },
  {
    icon: Trophy,
    title: "Reputation rewards fair participation",
    body: "Useful approved tests build tester reputation. Fair, timely campaign reviews build developer reputation. The Wall of Fame highlights trusted contributors.",
    location: "Main navigation → Wall of Fame",
    href: "/wall-of-fame",
    linkLabel: "View Wall of Fame"
  },
  {
    icon: HelpCircle,
    title: "Help is always available",
    body: "The Help Centre explains projects, campaigns, testing, feedback, credits, reputation, notifications and disputes. You can restart this introduction from your profile or Help Centre.",
    location: "Main navigation → Help",
    href: "/help",
    linkLabel: "Open Help Centre"
  }
];

const testerSteps: TourStep[] = [
  {
    icon: Compass,
    title: "Discover apps and games",
    body: "Discover contains public project pages. Campaigns contains active testing opportunities with requirements, testing time and rewards.",
    location: "Main navigation → Discover or Campaigns",
    href: "/campaigns",
    linkLabel: "Browse campaigns"
  },
  {
    icon: TestTube2,
    title: "Manage tests in My testing",
    body: "After joining a campaign, use My testing to start the test, log sessions, submit feedback and respond when a creator requests changes.",
    location: "Dashboard → My testing",
    href: "/dashboard/testing",
    linkLabel: "Open My testing"
  },
  {
    icon: Coins,
    title: "Earn Nexus Credits",
    body: "Valid feedback earns the campaign reward after approval. Credits can later fund your own campaigns and eligible platform features.",
    location: "Dashboard → Credits",
    href: "/dashboard/credits",
    linkLabel: "Open credits"
  },
  {
    icon: ShieldCheck,
    title: "Honest feedback is protected",
    body: "Creators may approve feedback, request changes or report a genuinely invalid test. They cannot simply reject useful feedback to avoid paying the reward.",
    location: "Help Centre → Feedback, safety and disputes",
    href: "/help#feedback-reviews",
    linkLabel: "Read feedback rules"
  }
];

const developerSteps: TourStep[] = [
  {
    icon: FolderPlus,
    title: "Create and publish projects",
    body: "Add your app or game in My projects. Unpublished projects remain private. Publish the project before its campaign can appear publicly.",
    location: "Dashboard → My projects",
    href: "/dashboard/projects",
    linkLabel: "Open My projects"
  },
  {
    icon: TestTube2,
    title: "Launch a testing campaign",
    body: "Open a project and create a campaign. Set clear instructions, minimum testing time, tester goal and reward. Campaign credits are reserved for valid submissions.",
    location: "My projects → Create campaign",
    href: "/dashboard/projects",
    linkLabel: "Manage projects"
  },
  {
    icon: ShieldCheck,
    title: "Review feedback fairly",
    body: "Approve and award valid work, request specific changes when requirements are incomplete, or report an invalid test for separate review. Negative feedback is not a valid rejection reason.",
    location: "Project campaign → Feedback",
    href: "/help#feedback-reviews",
    linkLabel: "Read review rules"
  },
  {
    icon: UserRound,
    title: "Build a trusted creator profile",
    body: "Complete your profile, add a banner and links, publish useful project updates and review submissions on time to strengthen your developer reputation.",
    location: "Dashboard → Profile",
    href: "/dashboard/profile",
    linkLabel: "Customize profile"
  }
];

export function OnboardingTour({
  initialRole,
  completeAction
}: {
  initialRole: OnboardingRole;
  completeAction: (formData: FormData) => Promise<void>;
}) {
  const [open, setOpen] = useState(true);
  const [role, setRole] = useState<OnboardingRole>(initialRole);
  const [step, setStep] = useState(-1);
  const [pending, startTransition] = useTransition();

  const steps = useMemo(() => {
    const roleSteps = role === "tester"
      ? testerSteps
      : role === "developer"
        ? developerSteps
        : [...testerSteps.slice(0, 3), ...developerSteps.slice(0, 3)];
    return [...roleSteps, ...commonSteps];
  }, [role]);

  const saveAndClose = () => {
    const formData = new FormData();
    formData.set("role", role);
    startTransition(async () => {
      await completeAction(formData);
      setOpen(false);
    });
  };

  if (!open) return null;

  if (step === -1) {
    return (
      <div className="fixed inset-0 z-[110] grid place-items-center overflow-y-auto bg-black/85 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Iconic Nexus introduction">
        <div className="my-6 w-full max-w-3xl overflow-hidden rounded-3xl border border-white/15 bg-[#121a2b] shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
            <p className="text-sm font-bold uppercase tracking-[.2em] text-cyan">Welcome to the Nexus</p>
            <button onClick={saveAndClose} disabled={pending} type="button" className="grid h-9 w-9 place-items-center rounded-lg hover:bg-white/10" aria-label="Skip introduction"><X size={20}/></button>
          </div>
          <div className="p-7 sm:p-9">
            <span className="badge border-lime/30 bg-lime/10 text-lime">First-time setup</span>
            <h2 className="mt-5 text-3xl font-black sm:text-4xl">How will you use Iconic Nexus?</h2>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-soft">Choose the closest option. The tour will explain where your most important tools are. You can still use every part of the platform.</p>
            <div className="mt-7 grid gap-4 md:grid-cols-3">
              {([
                ["tester", TestTube2, "I want to test", "Find campaigns, submit feedback, earn credits and build tester reputation."],
                ["developer", FolderPlus, "I want to publish", "Create projects, recruit testers, review feedback and build creator reputation."],
                ["both", LayoutDashboard, "I want to do both", "Learn the complete tester and creator workflow."]
              ] as const).map(([value, Icon, title, description]) => (
                <button key={value} type="button" onClick={() => setRole(value)} className={`rounded-2xl border p-5 text-left transition ${role === value ? "border-lime/60 bg-lime/10 shadow-[0_0_28px_rgba(158,255,58,.12)]" : "border-white/10 bg-white/[0.035] hover:border-cyan/35 hover:bg-white/[0.06]"}`}>
                  <div className={`grid h-12 w-12 place-items-center rounded-xl ${role === value ? "bg-lime text-ink" : "bg-white/10 text-cyan"}`}><Icon size={23}/></div>
                  <h3 className="mt-4 text-lg font-black">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-soft">{description}</p>
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col-reverse gap-3 border-t border-white/10 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <button onClick={saveAndClose} disabled={pending} className="btn-secondary" type="button">Skip for now</button>
            <button onClick={() => setStep(0)} className="btn-primary gap-2" type="button">Start guided tour <ArrowRight size={17}/></button>
          </div>
        </div>
      </div>
    );
  }

  const current = steps[step];
  const Icon = current.icon;

  return (
    <div className="fixed inset-0 z-[110] grid place-items-center overflow-y-auto bg-black/85 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Iconic Nexus guided tour">
      <div className="my-6 w-full max-w-2xl overflow-hidden rounded-3xl border border-white/15 bg-[#121a2b] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <p className="text-sm font-bold uppercase tracking-[.2em] text-cyan">Guided tour · {step + 1} of {steps.length}</p>
          <button onClick={saveAndClose} disabled={pending} type="button" className="grid h-9 w-9 place-items-center rounded-lg hover:bg-white/10" aria-label="Close introduction"><X size={20}/></button>
        </div>
        <div className="p-7 sm:p-9">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-lime text-ink"><Icon size={30}/></div>
          <h2 className="mt-6 text-3xl font-black">{current.title}</h2>
          <p className="mt-4 text-lg leading-8 text-soft">{current.body}</p>
          <div className="mt-5 rounded-2xl border border-cyan/20 bg-cyan/[0.06] p-4">
            <p className="text-xs font-bold uppercase tracking-[.2em] text-cyan">Where to find it</p>
            <p className="mt-2 font-semibold text-white">{current.location}</p>
          </div>
          {current.href && <Link href={current.href} className="btn-secondary mt-4 inline-flex" onClick={() => setOpen(false)}>{current.linkLabel || "Open this area"} <ArrowRight size={16}/></Link>}
          <div className="mt-7 flex gap-2">{steps.map((_, index) => <span key={index} className={`h-2 flex-1 rounded-full ${index <= step ? "bg-lime" : "bg-white/10"}`}/>)}</div>
        </div>
        <div className="flex items-center justify-between border-t border-white/10 px-6 py-4">
          <button onClick={() => setStep((value) => Math.max(-1, value - 1))} disabled={pending} className="btn-secondary gap-2" type="button"><ArrowLeft size={17}/> Back</button>
          {step < steps.length - 1
            ? <button onClick={() => setStep((value) => value + 1)} className="btn-primary gap-2" type="button">Next <ArrowRight size={17}/></button>
            : <button onClick={saveAndClose} disabled={pending} className="btn-primary gap-2" type="button"><Check size={18}/>{pending ? "Saving…" : "Finish tour"}</button>}
        </div>
      </div>
    </div>
  );
}

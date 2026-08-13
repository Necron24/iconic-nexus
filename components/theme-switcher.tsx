"use client";

import { Palette } from "lucide-react";
import { useEffect, useState } from "react";

type Theme = "system" | "dark" | "light" | "contrast";
type Accent = "nexus" | "ocean" | "violet" | "sunset" | "candy";

const themes: { value: Theme; label: string }[] = [
  { value: "system", label: "System" }, { value: "dark", label: "Nexus Dark" },
  { value: "light", label: "Light" }, { value: "contrast", label: "High Contrast" },
];
const accents: { value: Accent; label: string; colours: string }[] = [
  { value: "nexus", label: "Nexus", colours: "#9eff3a,#57e6ff" },
  { value: "ocean", label: "Ocean", colours: "#38bdf8,#22d3ee" },
  { value: "violet", label: "Violet", colours: "#c084fc,#818cf8" },
  { value: "sunset", label: "Sunset", colours: "#fb7185,#fbbf24" },
  { value: "candy", label: "Candy", colours: "#f472b6,#a78bfa" },
];

function applyPreferences(theme: Theme, accent: Accent, motion: boolean) {
  const resolved = theme === "system" ? (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark") : theme;
  document.documentElement.dataset.theme = resolved;
  document.documentElement.dataset.accent = accent;
  document.documentElement.dataset.motion = motion ? "on" : "off";
}

export function ThemeSwitcher({ mobile = false }: { mobile?: boolean }) {
  const [theme, setTheme] = useState<Theme>("system");
  const [accent, setAccent] = useState<Accent>("nexus");
  const [motion, setMotion] = useState(true);

  useEffect(() => {
    const savedTheme = (localStorage.getItem("nexus-theme") || "system") as Theme;
    const savedAccent = (localStorage.getItem("nexus-accent") || "nexus") as Accent;
    const savedMotion = localStorage.getItem("nexus-motion") !== "off" && !matchMedia("(prefers-reduced-motion: reduce)").matches;
    setTheme(savedTheme); setAccent(savedAccent); setMotion(savedMotion);
    applyPreferences(savedTheme, savedAccent, savedMotion);
  }, []);

  const save = (nextTheme = theme, nextAccent = accent, nextMotion = motion) => {
    localStorage.setItem("nexus-theme", nextTheme); localStorage.setItem("nexus-accent", nextAccent);
    localStorage.setItem("nexus-motion", nextMotion ? "on" : "off");
    applyPreferences(nextTheme, nextAccent, nextMotion);
  };

  const controls = <div className="grid gap-4">
    <label className="grid gap-1.5 text-sm font-bold">Base theme<select value={theme} onChange={e => { const value=e.target.value as Theme; setTheme(value); save(value, accent, motion); }} className="field !py-2">{themes.map(x=><option key={x.value} value={x.value}>{x.label}</option>)}</select></label>
    <div><p className="mb-2 text-sm font-bold">Accent style</p><div className="grid grid-cols-5 gap-2">{accents.map(x=><button key={x.value} type="button" onClick={()=>{setAccent(x.value);save(theme,x.value,motion)}} className={`h-9 rounded-lg border-2 transition hover:scale-105 ${accent===x.value?"border-white shadow-[0_0_16px_var(--nexus-primary)]":"border-transparent"}`} style={{background:`linear-gradient(135deg,${x.colours})`}} aria-label={`${x.label} accent`} title={x.label}/>)}</div></div>
    <label className="flex items-center justify-between gap-4 text-sm font-bold"><span>Fun animations</span><input type="checkbox" checked={motion} onChange={e=>{setMotion(e.target.checked);save(theme,accent,e.target.checked)}} className="h-5 w-5 accent-lime" /></label>
  </div>;

  if (mobile) return <section className="rounded-xl border border-white/10 p-4"><h3 className="mb-4 flex items-center gap-2 font-black"><Palette size={18}/> Appearance</h3>{controls}</section>;
  return <details className="group relative"><summary className="flex h-10 cursor-pointer list-none items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 text-sm font-semibold transition hover:bg-white/10"><Palette size={17}/><span>Style</span></summary><div className="absolute right-0 top-12 z-50 w-72 rounded-2xl border border-white/15 bg-ink p-5 shadow-2xl"><h3 className="mb-4 font-black">Make Nexus yours</h3>{controls}</div></details>;
}

"use client";

import { Contrast, Moon, Sun, Monitor } from "lucide-react";
import { useEffect, useState } from "react";

type Theme = "system" | "dark" | "light" | "contrast";

const choices: { value: Theme; label: string }[] = [
  { value: "system", label: "System" },
  { value: "dark", label: "Nexus Dark" },
  { value: "light", label: "Light" },
  { value: "contrast", label: "High Contrast" },
];

function applyTheme(theme: Theme) {
  const resolved = theme === "system"
    ? (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark")
    : theme;
  document.documentElement.dataset.theme = resolved;
}

export function ThemeSwitcher({ mobile = false }: { mobile?: boolean }) {
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    const saved = localStorage.getItem("nexus-theme") as Theme | null;
    const initial = choices.some(({ value }) => value === saved) ? saved! : "system";
    setTheme(initial);
    applyTheme(initial);

    const media = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = () => initial === "system" && applyTheme("system");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const updateTheme = (value: Theme) => {
    setTheme(value);
    localStorage.setItem("nexus-theme", value);
    applyTheme(value);
  };

  const Icon = theme === "light" ? Sun : theme === "contrast" ? Contrast : theme === "system" ? Monitor : Moon;

  return (
    <label className={mobile ? "flex items-center gap-3 rounded-xl px-4 py-3" : "relative flex items-center"}>
      <Icon size={17} aria-hidden="true" className={mobile ? "shrink-0" : "pointer-events-none absolute left-3 z-10 text-soft"} />
      <span className="sr-only">Colour theme</span>
      <select
        value={theme}
        onChange={(event) => updateTheme(event.target.value as Theme)}
        className={mobile ? "field !py-2" : "h-10 max-w-36 rounded-xl border border-white/15 bg-white/5 py-2 pl-9 pr-3 text-sm font-semibold outline-none transition hover:bg-white/10 focus:border-cyan"}
        aria-label="Colour theme"
      >
        {choices.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
      </select>
    </label>
  );
}

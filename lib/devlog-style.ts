export const DEVLOG_UPDATE_TYPES = [
  "development",
  "release",
  "bug_fixes",
  "testing_needed",
  "major_update",
  "announcement"
] as const;

export const DEVLOG_HEADING_FONTS = ["display", "sans", "serif", "mono", "rounded"] as const;
export const DEVLOG_BODY_FONTS = ["sans", "serif", "mono", "humanist"] as const;
export const DEVLOG_BACKGROUNDS = ["gradient", "solid", "image", "none"] as const;
export const DEVLOG_CARD_STYLES = ["glass", "solid", "outline", "minimal"] as const;
export const DEVLOG_LAYOUTS = ["editorial", "showcase", "compact"] as const;
export const DEVLOG_TEXT_ALIGNMENTS = ["left", "center"] as const;
export const DEVLOG_IMAGE_FITS = ["cover", "contain"] as const;

export type DevlogStyle = {
  accent_color?: string | null;
  background_color?: string | null;
  background_style?: string | null;
  background_image_url?: string | null;
  heading_font?: string | null;
  body_font?: string | null;
  card_style?: string | null;
  layout_style?: string | null;
  text_align?: string | null;
  image_fit?: string | null;
};

export const DEFAULT_DEVLOG_STYLE = {
  accent_color: "#57E6FF",
  background_color: "#111827",
  background_style: "gradient",
  background_image_url: null,
  heading_font: "display",
  body_font: "sans",
  card_style: "glass",
  layout_style: "editorial",
  text_align: "left",
  image_fit: "cover"
} satisfies Required<DevlogStyle>;

export const headingFontStacks: Record<string, string> = {
  display: '"Arial Black", "Arial Narrow", Arial, sans-serif',
  sans: 'Inter, Arial, Helvetica, sans-serif',
  serif: 'Georgia, "Times New Roman", serif',
  mono: '"Courier New", Courier, monospace',
  rounded: '"Trebuchet MS", "Arial Rounded MT Bold", Arial, sans-serif'
};

export const bodyFontStacks: Record<string, string> = {
  sans: 'Inter, Arial, Helvetica, sans-serif',
  serif: 'Georgia, "Times New Roman", serif',
  mono: '"Courier New", Courier, monospace',
  humanist: '"Trebuchet MS", Verdana, Arial, sans-serif'
};

export function normalizeHexColor(value: unknown, fallback: string) {
  const text = String(value ?? "").trim();
  return /^#[0-9a-f]{6}$/i.test(text) ? text.toUpperCase() : fallback;
}

export function devlogBackground(style: DevlogStyle): string {
  const accent = normalizeHexColor(style.accent_color, DEFAULT_DEVLOG_STYLE.accent_color);
  const background = normalizeHexColor(style.background_color, DEFAULT_DEVLOG_STYLE.background_color);
  const mode = style.background_style ?? DEFAULT_DEVLOG_STYLE.background_style;

  if (mode === "none") return "transparent";
  if (mode === "solid") return background;
  if (mode === "image" && style.background_image_url) {
    return `linear-gradient(135deg, ${background}F2, ${background}B8), url("${style.background_image_url.replaceAll('"', "%22")}") center / cover`;
  }
  return `radial-gradient(circle at top right, ${accent}33, transparent 42%), linear-gradient(135deg, ${background}, #0B1020)`;
}

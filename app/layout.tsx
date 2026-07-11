import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Iconic Nexus", template: "%s | Iconic Nexus" },
  description: "Discover, test and improve indie apps and games with real community feedback.",
  applicationName: "Iconic Nexus",
  keywords: ["app testing", "game testing", "indie developers", "beta testers", "closed testing"],
  icons: {
    icon: [
      { url: "/icon.png", sizes: "any" }
    ],
    apple: "/icon.png"
  },
  openGraph: { type: "website", siteName: "Iconic Nexus", title: "Iconic Nexus", description: "Where developers and testers connect.", url: siteUrl, images: [{ url: "/brand/iconic-nexus-logo.png", width: 2172, height: 724, alt: "Iconic Nexus logo" }] },
  twitter: { card: "summary_large_image", title: "Iconic Nexus", description: "Where developers and testers connect.", images: ["/brand/iconic-nexus-logo.png"] },
  robots: { index: true, follow: true }
};
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="en"><body><Header /><main className="min-h-screen">{children}</main><Footer /></body></html>; }

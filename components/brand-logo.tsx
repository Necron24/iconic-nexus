import Image from "next/image";
import Link from "next/link";

export function BrandLogo({ priority = false, className = "" }: { priority?: boolean; className?: string }) {
  return (
    <Link href="/" className={`group flex items-center gap-3 ${className}`.trim()} aria-label="Iconic Nexus home">
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#071127] shadow-[0_0_24px_rgba(87,230,255,.12)] transition group-hover:scale-[1.02] group-hover:shadow-[0_0_28px_rgba(158,255,58,.18)]">
        <Image
          src="/brand/iconic-nexus-icon.png"
          alt="Iconic Nexus logo icon"
          width={44}
          height={44}
          className="h-11 w-11 object-cover"
          priority={priority}
        />
      </div>
      <div className="hidden sm:block">
        <Image
          src="/brand/iconic-nexus-logo.png"
          alt="Iconic Nexus"
          width={340}
          height={113}
          className="h-auto w-[190px] md:w-[220px]"
          priority={priority}
        />
      </div>
      <div className="sm:hidden leading-none">
        <span className="block text-lg font-black tracking-tight text-white">Iconic</span>
        <span className="block bg-gradient-to-r from-lime via-lime to-cyan bg-clip-text text-lg font-black tracking-tight text-transparent">Nexus</span>
      </div>
    </Link>
  );
}

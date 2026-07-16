import Image from "next/image";
import Link from "next/link";

export function BrandLogo({
  priority = false,
  className = ""
}: {
  priority?: boolean;
  className?: string;
}) {
  return (
    <Link
      href="/"
      className={`group flex items-center ${className}`.trim()}
      aria-label="Iconic Nexus home"
    >
      <div className="block overflow-hidden rounded-2xl border border-white/10 bg-[#071127] shadow-[0_0_24px_rgba(87,230,255,.12)] transition group-hover:scale-[1.02] group-hover:shadow-[0_0_28px_rgba(158,255,58,.18)] md:hidden">
        <Image
          src="/brand/iconic-nexus-icon.png"
          alt="Iconic Nexus"
          width={48}
          height={48}
          className="h-12 w-12 object-cover"
          priority={priority}
        />
      </div>

      <div className="hidden md:block">
        <Image
          src="/brand/iconic-nexus-logo.png"
          alt="Iconic Nexus"
          width={340}
          height={113}
          className="h-auto w-[220px] lg:w-[240px]"
          priority={priority}
        />
      </div>
    </Link>
  );
}
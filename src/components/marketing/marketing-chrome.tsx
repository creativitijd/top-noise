import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { BrandMark } from "@/components/brand/brand-mark";
import { cn } from "@/lib/utils";

export function MarketingChrome({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#010001] font-sans text-white">
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#010001]/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <BrandMark light />
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className={cn(buttonVariants({ variant: "ghost" }), "text-white/80 hover:bg-white/10 hover:text-white")}
            >
              Inloggen
            </Link>
            <Link
              href="/login?tab=signup"
              className={cn(buttonVariants(), "bg-[#fe2f55] text-white hover:bg-[#fe2f55]/90")}
            >
              Gratis Starten
            </Link>
          </div>
        </div>
      </nav>
      {children}
      <footer className="border-t border-white/10 px-4 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-sm text-white/50 md:flex-row">
          <BrandMark light />
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/faq" className="hover:text-white">
              FAQ
            </Link>
            <Link href="/privacy-policy" className="hover:text-white">
              Privacy Policy
            </Link>
            <Link href="/policies" className="hover:text-white">
              Voorwaarden
            </Link>
          </div>
          <p>© {new Date().getFullYear()} Top Noise. Alle rechten voorbehouden.</p>
        </div>
      </footer>
    </div>
  );
}

export function LegalArticle({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <MarketingChrome>
      <article className="mx-auto max-w-3xl px-4 py-16">
        <Link href="/" className="text-sm text-[#03fce8] hover:underline">
          Terug naar home
        </Link>
        <h1 className="mt-4 text-4xl font-black tracking-tight">{title}</h1>
        <div className="mt-8 space-y-6 text-white/75 [&_h2]:mt-10 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-white [&_h3]:mt-6 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-white [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1">
          {children}
        </div>
      </article>
    </MarketingChrome>
  );
}

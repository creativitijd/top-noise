import Link from "next/link";
import { BrandMark } from "@/components/brand/brand-mark";

export function MarketingChrome({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f5f5f4] text-[#1f1b18]">
      <div className="sticky top-0 z-50 px-4 py-3.5">
        <nav className="mx-auto flex max-w-[1180px] items-center justify-between rounded-full border border-[rgb(31_27_24_/_7%)] bg-white/85 px-4 py-2.5 backdrop-blur-md">
          <BrandMark />
          <div className="flex items-center gap-2">
            <Link href="/login" className="rounded-full px-3.5 py-2 text-sm font-semibold text-[#635a52]">
              Inloggen
            </Link>
            <Link
              href="/login?tab=signup"
              className="rounded-full bg-[#1f1b18] px-5 py-2.5 text-sm font-semibold text-white"
            >
              Gratis proberen
            </Link>
          </div>
        </nav>
      </div>
      {children}
      <footer className="border-t border-[rgb(31_27_24_/_10%)] px-6 py-8 text-sm text-[#8b8079]">
        <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-4">
          <BrandMark />
          <div className="flex gap-5">
            <Link href="/faq">FAQ</Link>
            <Link href="/privacy-policy">Privacy</Link>
            <Link href="/policies">Voorwaarden</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

export function LegalArticle({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <MarketingChrome>
      <article className="mx-auto max-w-3xl px-6 py-16">
        <Link href="/" className="text-sm font-semibold text-[#3f6b2b]">
          Terug naar home
        </Link>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight">{title}</h1>
        <div className="mt-8 space-y-6 text-[#635a52] [&_h2]:mt-10 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:text-[#1f1b18] [&_h3]:mt-6 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-[#1f1b18] [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1">
          {children}
        </div>
      </article>
    </MarketingChrome>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  BarChart3,
  Calendar,
  Check,
  Clock,
  ImageIcon,
  Menu,
  Mic,
  Pencil,
  X,
} from "lucide-react";
import { BrandMark } from "@/components/brand/brand-mark";

const faqs = [
  {
    q: "Moet ik zelf nog iets schrijven?",
    a: "Nee. Je krijgt volledige posts, klaar om te publiceren. Aanpassen kan altijd. De meeste mensen veranderen alleen een paar woorden.",
  },
  {
    q: "Klinkt het niet als generieke AI-tekst?",
    a: "Top Noise leest je bestaande posts en leert daar je stem uit. Hoe meer je goedkeurt of herschrijft, hoe dichter het erbij komt.",
  },
  {
    q: "Hoeveel tijd kost het me per maand?",
    a: "Reken op een halfuur tot een uur om je plan na te kijken en goed te keuren. Daarna loopt de maand vanzelf door.",
  },
  {
    q: "Kan ik met meerdere mensen werken?",
    a: "Ja. Nodig collega's of je klant uit om mee te kijken en goed te keuren voor er iets online staat.",
  },
  {
    q: "Wat als ik wil stoppen?",
    a: "Maandelijks opzegbaar, zonder belletje met een accountmanager. Je content en kalender neem je mee.",
  },
];

export function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="overflow-x-hidden bg-[#f5f5f4] text-[#1f1b18]">
      <div className="sticky top-0 z-50 px-4 py-3.5">
        <header className="mx-auto flex max-w-[1180px] items-center gap-6 rounded-full border border-[rgb(31_27_24_/_7%)] bg-white/85 px-4 py-2.5 shadow-[0_6px_24px_rgb(31_27_24_/_6%)] backdrop-blur-md">
          <BrandMark />
          <nav className="ml-auto hidden items-center gap-1 text-[14.5px] font-medium md:flex">
            <a href="#hoe" className="rounded-full px-3 py-2 text-[#635a52] hover:bg-[rgb(31_27_24_/_5%)] hover:text-[#1f1b18]">
              Hoe het werkt
            </a>
            <a href="#features" className="rounded-full px-3 py-2 text-[#635a52] hover:bg-[rgb(31_27_24_/_5%)] hover:text-[#1f1b18]">
              Features
            </a>
            <a href="#platformen" className="rounded-full px-3 py-2 text-[#635a52] hover:bg-[rgb(31_27_24_/_5%)] hover:text-[#1f1b18]">
              Platformen
            </a>
            <a href="#faq" className="rounded-full px-3 py-2 text-[#635a52] hover:bg-[rgb(31_27_24_/_5%)] hover:text-[#1f1b18]">
              FAQ
            </a>
          </nav>
          <div className="hidden items-center gap-1.5 md:flex">
            <Link href="/login" className="rounded-full px-3.5 py-2 text-[14.5px] font-semibold text-[#635a52] hover:bg-[rgb(31_27_24_/_5%)]">
              Inloggen
            </Link>
            <Link
              href="/login?tab=signup"
              className="rounded-full bg-[#1f1b18] px-5 py-2.5 text-[14.5px] font-semibold text-white hover:bg-[#3a1f1b]"
            >
              Gratis proberen
            </Link>
          </div>
          <button
            type="button"
            className="ml-auto rounded-full p-2 md:hidden"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label="Menu"
          >
            {menuOpen ? <X /> : <Menu />}
          </button>
        </header>
        {menuOpen ? (
          <div className="mx-auto mt-2 max-w-[1180px] space-y-1 rounded-3xl bg-white p-4 shadow-lg md:hidden">
            <a href="#hoe" className="block rounded-xl px-3 py-2">Hoe het werkt</a>
            <a href="#features" className="block rounded-xl px-3 py-2">Features</a>
            <Link href="/login" className="block rounded-xl px-3 py-2">Inloggen</Link>
            <Link href="/login?tab=signup" className="block rounded-full bg-[#1f1b18] px-4 py-3 text-center text-white">
              Gratis proberen
            </Link>
          </div>
        ) : null}
      </div>

      <section className="relative">
        <div className="pointer-events-none absolute top-[-180px] left-1/2 h-[520px] w-[1100px] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,rgba(196,222,160,.5),rgba(245,245,244,0)_70%)]" />
        <div className="relative mx-auto max-w-[1180px] px-6 pt-14">
          <div className="max-w-[900px]">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[rgb(31_27_24_/_8%)] bg-white py-1.5 pr-4 pl-2">
              <span className="flex gap-0.5">
                <span className="block size-1.5 rounded-[2px] bg-[#f4243f]" />
                <span className="block size-1.5 rounded-[2px] bg-[#0fd8ce]" />
              </span>
              <span className="text-[13px] font-semibold text-[#3f6b2b]">Nieuw: automatisch publiceren op LinkedIn</span>
            </div>
            <h1 className="mb-5 text-balance text-[clamp(44px,7vw,88px)] leading-[0.96] font-semibold tracking-[-0.045em]">
              Een maand social media, in één middag geregeld.
              <span className="mb-[0.42em] ml-3 inline-block size-3 animate-[tn-blink_4.5s_ease-in-out_infinite] rounded-full bg-[#f4243f] align-middle" />
            </h1>
            <p className="mb-8 max-w-[52ch] text-[19px] text-[#635a52]">
              Top Noise maakt je maandplan, schrijft de posts per platform en zet ze zelf online. Jij kijkt het na
              met een koffie erbij.
            </p>
            <div className="mb-4 flex flex-wrap items-center gap-2.5">
              <Link
                href="/login?tab=signup"
                className="inline-flex items-center gap-2.5 rounded-full bg-[#4f8637] px-6 py-4 text-[16.5px] font-semibold text-white hover:bg-[#3f6b2b]"
              >
                14 dagen gratis proberen
                <ArrowRight className="size-4" />
              </Link>
              <a
                href="#hoe"
                className="rounded-full border border-[rgb(31_27_24_/_16%)] px-6 py-4 text-[16.5px] font-semibold hover:bg-[rgb(31_27_24_/_4%)]"
              >
                Bekijk hoe het werkt
              </a>
            </div>
            <p className="text-[13.5px] text-[#8b8079]">Geen kaart nodig · Eerste maandplan in 10 minuten · Opzeggen in twee klikken</p>
          </div>

          <div className="relative mt-12">
            <span className="absolute top-[-24px] left-[-10px] z-10 inline-block rotate-[-6deg] rounded-full bg-[#c2572c] px-4 py-2 text-[13px] font-semibold text-white shadow-[0_10px_20px_-10px_rgba(194,87,44,.9)]">
              zo ziet je maand eruit
            </span>
            <div className="overflow-hidden rounded-[26px] border border-[rgb(31_27_24_/_8%)] bg-white shadow-[0_30px_70px_-30px_rgb(31_27_24_/_35%)]">
              <div className="flex items-center gap-2 border-b border-[rgb(31_27_24_/_6%)] px-4 py-3.5">
                <span className="size-2.5 rounded-full bg-[#e8ccc3]" />
                <span className="size-2.5 rounded-full bg-[#ecdcba]" />
                <span className="size-2.5 rounded-full bg-[#c9dcae]" />
                <span className="ml-3 rounded-full bg-[rgb(31_27_24_/_5%)] px-3.5 py-1 text-[12.5px] font-medium text-[#8b8079]">
                  app.top-noise.com/kalender
                </span>
              </div>
              <Image
                src="/brand/planner-preview.png"
                alt="De Top Noise planner met de contentkalender"
                width={1600}
                height={1000}
                className="h-auto w-full"
                priority
              />
            </div>
            <div className="absolute right-5 bottom-[-26px] flex animate-[tn-drift_5.5s_ease-in-out_infinite] items-center gap-2.5 rounded-[18px] border border-[rgb(31_27_24_/_8%)] bg-white py-2.5 pr-4 pl-3 shadow-[0_16px_34px_-14px_rgb(31_27_24_/_40%)]">
              <span className="flex size-8 items-center justify-center rounded-[11px] bg-[#f1f6e7] text-[#4f8637]">
                <Check className="size-4" />
              </span>
              <span className="text-[13px] leading-tight font-semibold">
                Vrijdag 11:00
                <br />
                <span className="font-medium text-[#8b8079]">automatisch gepubliceerd</span>
              </span>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-[1180px] px-6 pt-16">
          <div className="grid overflow-hidden rounded-[22px] border border-[rgb(31_27_24_/_10%)] bg-[rgb(31_27_24_/_10%)] sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["6u", "bespaard per maand"],
              ["30+", "posts per maandplan"],
              ["3", "kanalen in één plan"],
              ["10 min", "tot je eerste plan"],
            ].map(([value, label]) => (
              <div key={label} className="bg-white p-6">
                <span className="block font-[family-name:var(--font-heading)] text-[30px] font-semibold tracking-[-0.04em]">
                  {value}
                </span>
                <span className="text-[13.5px] font-medium text-[#8b8079]">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="hoe" className="mx-auto max-w-[1180px] px-6 py-24">
        <span className="text-[13px] font-semibold tracking-[0.12em] text-[#b8562c] uppercase">Hoe het werkt</span>
        <h2 className="mt-3 mb-11 max-w-[18ch] text-[clamp(32px,4vw,52px)] leading-[1.02] font-semibold tracking-[-0.04em]">
          Drie stappen. De rest doet Top Noise.
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              n: "01",
              title: "Vertel wat je doet",
              text: "Je bedrijf, je toon, je doelgroep. Je vult het één keer in. Top Noise onthoudt het en bouwt er elke maand op verder.",
              chip: "5 minuten",
              wrap: "bg-[#f1f6e7] border-[#d9e7c2]",
              iconWrap: "bg-[#4f8637] -rotate-[5deg]",
              num: "text-[rgb(79_134_55_/_35%)]",
              chipText: "text-[#3f6b2b]",
              body: "text-[#4e5b3e]",
              Icon: Mic,
            },
            {
              n: "02",
              title: "Krijg je maandplan",
              text: "Een volle kalender met thema's, teksten en beeld per platform. Schuiven en herschrijven mag altijd.",
              chip: "30+ posts",
              wrap: "bg-[#fbf1e8] border-[#f0d6c2]",
              iconWrap: "bg-[#c2572c] rotate-[4deg]",
              num: "text-[rgb(194_87_44_/_32%)]",
              chipText: "text-[#b8562c]",
              body: "text-[#6b503f]",
              Icon: Calendar,
            },
            {
              n: "03",
              title: "Goedkeuren en klaar",
              text: "Eén klik en alles staat ingepland. Publiceren gebeurt vanzelf, op het moment dat je publiek wakker is.",
              chip: "klaar voor de maand",
              wrap: "bg-[#eceafb] border-[#d8d3f2]",
              iconWrap: "bg-[#5b4fa8] -rotate-[3deg]",
              num: "text-[rgb(91_79_168_/_30%)]",
              chipText: "text-[#5b4fa8]",
              body: "text-[#4f4870]",
              Icon: Check,
            },
          ].map((step) => (
            <div key={step.n} className={`relative overflow-hidden rounded-3xl border p-8 ${step.wrap}`}>
              <span className="absolute top-[-30px] right-[-30px] size-[130px] rounded-full bg-white/55" />
              <div className="relative mb-5 flex items-center gap-3">
                <span className={`flex size-[52px] items-center justify-center rounded-[18px] text-white shadow-lg ${step.iconWrap}`}>
                  <step.Icon className="size-6" />
                </span>
                <span className={`font-[family-name:var(--font-heading)] text-[40px] leading-none font-semibold tracking-[-0.05em] ${step.num}`}>
                  {step.n}
                </span>
              </div>
              <h3 className="relative mb-2.5 text-[25px] font-semibold tracking-[-0.035em]">{step.title}</h3>
              <p className={`relative mb-4 text-base ${step.body}`}>{step.text}</p>
              <span className={`relative inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[12.5px] font-semibold ${step.chipText}`}>
                <Clock className="size-3.5" />
                {step.chip}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section id="features" className="mx-auto max-w-[1180px] px-6 pb-24">
        <div className="mb-11 flex flex-wrap items-end justify-between gap-5">
          <div className="max-w-[44ch]">
            <span className="text-[13px] font-semibold tracking-[0.12em] text-[#3f6b2b] uppercase">Features</span>
            <h2 className="mt-3 text-[clamp(32px,4vw,52px)] leading-[1.02] font-semibold tracking-[-0.04em]">
              Alles wat je nu op vier tabbladen doet
            </h2>
          </div>
          <Link href="/login?tab=signup" className="inline-flex items-center gap-2 text-[15.5px] font-semibold text-[#3f6b2b]">
            Alle features bekijken
            <ArrowRight className="size-4" />
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              title: "Maandplan in één klik",
              text: "Top Noise verdeelt je thema's over de maand. Feestdagen, seizoen en je eigen acties zitten er al in.",
              bg: "bg-[#f1f6e7] text-[#3f6b2b]",
              Icon: Calendar,
            },
            {
              title: "Per platform herschreven",
              text: "Eén idee wordt drie posts: kort voor Instagram, losser voor Facebook, zakelijker voor LinkedIn.",
              bg: "bg-[#fbf1e8] text-[#b8562c]",
              Icon: Pencil,
            },
            {
              title: "Jouw stem, niet die van AI",
              text: "We leren je woordkeuze, lengte en humor. Herschrijf je iets? Dan leert het bij.",
              bg: "bg-[#eceafb] text-[#5b4fa8]",
              Icon: Mic,
            },
            {
              title: "Automatisch publiceren",
              text: "Goedgekeurde posts gaan zelf online, ook 's avonds. Mislukt er iets, dan hoor je het meteen.",
              bg: "bg-[#e6eef9] text-[#3c5c85]",
              Icon: Clock,
            },
            {
              title: "Beeld erbij gezocht",
              text: "Bij elke post een visual brief, en later beeld uit je bibliotheek of stock die bij je huisstijl past.",
              bg: "bg-[#f5f3f0] text-[#8b6a4f]",
              Icon: ImageIcon,
            },
            {
              title: "Zie wat werkt",
              text: "Per post bereik en reacties, per maand wat het beste scoorde. Daarvan plant Top Noise er daarna meer.",
              bg: "bg-[#f1f6e7] text-[#3f6b2b]",
              Icon: BarChart3,
            },
          ].map((feature) => (
            <div key={feature.title} className="rounded-[22px] border border-[rgb(31_27_24_/_8%)] bg-white p-[30px]">
              <span className={`mb-5 flex size-11 items-center justify-center rounded-[14px] ${feature.bg}`}>
                <feature.Icon className="size-[22px]" />
              </span>
              <h3 className="mb-2 text-xl font-semibold tracking-[-0.03em]">{feature.title}</h3>
              <p className="text-[15.5px] text-[#635a52]">{feature.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="platformen" className="mx-auto max-w-[1180px] px-6 pb-24">
        <div className="grid items-center gap-12 rounded-[28px] bg-[#1f1b18] px-8 py-14 text-white md:grid-cols-2 md:px-12">
          <div>
            <span className="text-[13px] font-semibold tracking-[0.12em] text-[#e9a878] uppercase">Platformen</span>
            <h2 className="mt-3 mb-3.5 text-[clamp(30px,3.6vw,46px)] leading-[1.02] font-semibold tracking-[-0.04em] text-white">
              Eén plan, drie kanalen
            </h2>
            <p className="mb-6 max-w-[38ch] text-[17px] text-white/70">
              Koppel je accounts één keer. Top Noise past lengte, toon en hashtags aan per kanaal en publiceert
              rechtstreeks vanuit de planner.
            </p>
            <Link
              href="/login?tab=signup"
              className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 text-base font-semibold text-[#1f1b18]"
            >
              Accounts koppelen
              <ArrowRight className="size-4" />
            </Link>
          </div>
          <div className="grid gap-2.5">
            {[
              { mark: "f", name: "Facebook", sub: "Pagina's en events", bg: "bg-[#e6eef9]" },
              { mark: "ig", name: "Instagram", sub: "Feed, carrousel en reels", bg: "bg-[#fbf1e8]" },
              { mark: "in", name: "LinkedIn", sub: "Bedrijfspagina en persoonlijk", bg: "bg-[#f1f6e7]" },
            ].map((item) => (
              <div
                key={item.name}
                className="flex items-center gap-4 rounded-[18px] border border-white/10 bg-white/6 px-5 py-4"
              >
                <span className={`flex size-10 items-center justify-center rounded-[13px] text-[15px] font-bold text-[#1f1b18] ${item.bg}`}>
                  {item.mark}
                </span>
                <span className="text-[16.5px] font-semibold">
                  {item.name}
                  <span className="block text-sm font-normal text-white/60">{item.sub}</span>
                </span>
                <span className="ml-auto text-xs font-semibold text-[#a9c98c]">Koppelen</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="mx-auto max-w-[1180px] px-6 pb-24">
        <div className="grid gap-12 rounded-3xl border border-[rgb(31_27_24_/_8%)] bg-white px-8 py-10 md:grid-cols-[0.8fr_1.2fr] md:px-11">
          <div>
            <h2 className="mb-3.5 text-[clamp(30px,3.6vw,46px)] leading-[1.02] font-semibold tracking-[-0.04em]">
              Veelgestelde vragen
            </h2>
            <p className="max-w-[30ch] text-[16.5px] text-[#635a52]">
              Staat je vraag er niet bij?{" "}
              <a href="mailto:info@top-noise.com" className="font-semibold text-[#3f6b2b]">
                Mail ons
              </a>
              , je hebt dezelfde dag antwoord.
            </p>
          </div>
          <div>
            {faqs.map((item, index) => (
              <div key={item.q} className={index === 0 ? "" : "border-t border-[rgb(31_27_24_/_12%)]"}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-4 py-5 text-left font-[family-name:var(--font-heading)] text-[19px] font-semibold tracking-[-0.02em]"
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                >
                  {item.q}
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-[rgb(31_27_24_/_14%)] text-[17px] text-[#635a52]">
                    {openFaq === index ? "–" : "+"}
                  </span>
                </button>
                {openFaq === index ? <p className="max-w-[62ch] pb-6 text-base text-[#635a52]">{item.a}</p> : null}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1180px] px-6 pb-24">
        <div className="relative overflow-hidden rounded-[28px] bg-[#4f8637] px-8 py-[72px] text-center text-white md:px-11">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_120%,rgba(255,255,255,.22),transparent_55%),radial-gradient(circle_at_85%_-20%,rgba(255,255,255,.16),transparent_50%)]" />
          <div className="relative">
            <h2 className="mx-auto mb-4 max-w-[20ch] text-balance text-[clamp(34px,4.4vw,60px)] leading-none font-semibold tracking-[-0.04em] text-white">
              Volgende maand staat al klaar.
            </h2>
            <span className="mb-4 inline-block rotate-2 rounded-full bg-white px-4 py-1.5 text-[13.5px] font-semibold text-[#3f6b2b]">
              en die daarna ook
            </span>
            <p className="mx-auto mb-8 max-w-[44ch] text-lg text-white/80">
              Veertien dagen gratis. Geen kaart, geen opzegtermijn, wel een volle kalender.
            </p>
            <div className="flex flex-wrap justify-center gap-2.5">
              <Link
                href="/login?tab=signup"
                className="rounded-full bg-[#1f1b18] px-7 py-4 text-[16.5px] font-semibold text-white hover:bg-black"
              >
                Gratis proberen
              </Link>
              <a
                href="mailto:info@top-noise.com"
                className="rounded-full border border-white/30 bg-white/14 px-6 py-4 text-[16.5px] font-semibold text-white hover:bg-white/22"
              >
                Liever eerst een demo
              </a>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-[rgb(31_27_24_/_10%)]">
        <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-5 px-6 py-10">
          <BrandMark />
          <nav className="flex flex-wrap gap-6 text-[14.5px] font-medium text-[#635a52]">
            <a href="#features">Features</a>
            <Link href="/faq">FAQ</Link>
            <a href="mailto:info@top-noise.com">Contact</a>
            <Link href="/privacy-policy">Privacy</Link>
            <Link href="/policies">Voorwaarden</Link>
          </nav>
          <span className="text-[13.5px] text-[#aaa09a]">© {new Date().getFullYear()} Top Noise</span>
        </div>
      </footer>
    </div>
  );
}

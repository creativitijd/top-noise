"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, BarChart3, Calendar, CheckCircle2, Clock, Image as ImageIcon, Menu, Rocket, Shield, Sparkles, Target, X } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { BrandMark } from "@/components/brand/brand-mark";
import { cn } from "@/lib/utils";

const features = [
  {
    title: "AI Content Generatie",
    description: "Laat AI unieke posts schrijven die passen bij jouw merk, tone of voice en doelgroep",
    icon: Sparkles,
    accent: false,
  },
  {
    title: "Multi-Platform",
    description: "Facebook, Instagram en LinkedIn — allemaal geoptimaliseerd per platform met juiste formatting",
    icon: Target,
    accent: true,
  },
  {
    title: "Automatisch Plannen",
    description: "Volledige maandplannen in seconden, afgestemd op jouw strategie en content pillars",
    icon: Clock,
    accent: false,
  },
  {
    title: "Direct Publiceren",
    description: "Keur posts goed en publiceer direct naar al je verbonden social media accounts",
    icon: Rocket,
    accent: true,
  },
  {
    title: "Contentkalender",
    description: "Overzichtelijke kalender met alle geplande posts en eenvoudig beheer",
    icon: Calendar,
    accent: false,
  },
  {
    title: "Visual Briefs",
    description: "AI genereert gedetailleerde visual briefs voor je grafisch ontwerpers",
    icon: ImageIcon,
    accent: true,
  },
  {
    title: "Content Pillars",
    description: "Definieer je content thema's en laat AI daar consistent posts over maken",
    icon: BarChart3,
    accent: false,
  },
  {
    title: "Brand Consistency",
    description: "Alle content blijft consistent met jouw merk, tone of voice en huisstijl",
    icon: Shield,
    accent: true,
  },
];

const steps = [
  {
    title: "Verbind je accounts",
    description: "Koppel je Facebook, Instagram en LinkedIn accounts in één klik. Veilig en eenvoudig via OAuth.",
  },
  {
    title: "Configureer je merk",
    description: "Vertel ons over je bedrijf, doelgroep en tone of voice. AI leert jouw unieke merk kennen.",
  },
  {
    title: "Laat AI plannen en creëren",
    description: "AI creëert een complete maandkalender met perfecte timing en platform-specifieke content.",
  },
  {
    title: "Review en publiceer",
    description: "Bekijk je posts, pas aan indien nodig, en publiceer automatisch naar al je kanalen.",
  },
];

const plans = [
  {
    name: "Starter",
    price: "€0",
    credits: "30 credits",
    note: "Gratis bij aanmelding",
    items: ["30 AI posts", "Alle platforms", "Visual briefs", "Contentkalender"],
    popular: false,
  },
  {
    name: "Small",
    price: "€49",
    credits: "50 credits",
    note: "€0,98 per credit",
    items: ["50 AI posts", "Alle platforms", "Visual briefs", "Priority support"],
    popular: false,
  },
  {
    name: "Medium",
    price: "€149",
    credits: "350 credits",
    note: "€0,43 per credit · Bespaar 56%",
    items: ["350 AI posts", "Alle platforms", "Visual briefs", "Priority support"],
    popular: true,
  },
  {
    name: "Large",
    price: "€349",
    credits: "1000 credits",
    note: "€0,35 per credit · Bespaar 64%",
    items: ["1000 AI posts", "Alle platforms", "Visual briefs", "Dedicated support"],
    popular: false,
  },
];

const testimonials = [
  {
    quote:
      "Top Noise heeft onze social media volledig getransformeerd. We besparen 5+ uur per week en krijgen meer engagement dan ooit.",
    name: "Sarah de Vries",
    role: "Marketing Manager bij TechStart",
    image: "/brand/testimonial-1.jpg",
  },
  {
    quote: "Eindelijk een tool die begrijpt wat ons merk nodig heeft. De AI schrijft posts die echt bij ons passen.",
    name: "Mark Jansen",
    role: "Founder ZelfstandigePlus",
    image: "/brand/testimonial-2.jpg",
  },
  {
    quote: "Van 0 naar 50 posts per maand. Onze online zichtbaarheid is geëxplodeerd sinds we Top Noise gebruiken.",
    name: "Lisa van den Berg",
    role: "Owner CreativeStudio",
    image: "/brand/testimonial-3.jpg",
  },
];

export function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#010001] font-sans text-white [&_h1]:font-sans [&_h2]:font-sans [&_h3]:font-sans [&_h4]:font-sans">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute top-1/4 -left-1/4 h-1/2 w-1/2 rounded-full bg-[#fe2f55]/20 blur-[120px]" />
        <div className="absolute right-[-10%] bottom-1/4 h-1/2 w-1/2 rounded-full bg-[#03fce8]/20 blur-[120px]" />
      </div>

      <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#010001]/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <BrandMark light />
          <div className="hidden items-center gap-3 md:flex">
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
          <button
            type="button"
            className="rounded-lg p-2 text-white md:hidden"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label="Menu"
          >
            {menuOpen ? <X /> : <Menu />}
          </button>
        </div>
        {menuOpen ? (
          <div className="space-y-2 border-t border-white/10 px-4 py-4 md:hidden">
            <Link href="/login" className="block rounded-lg px-3 py-2 text-white/80 hover:bg-white/5">
              Inloggen
            </Link>
            <Link href="/login?tab=signup" className={cn(buttonVariants(), "w-full bg-[#fe2f55] text-white")}>
              Gratis Starten
            </Link>
          </div>
        ) : null}
      </nav>

      <section className="relative z-10 mx-auto max-w-6xl px-4 pt-20 pb-28 text-center md:pt-28">
        <h1 className="text-6xl font-black tracking-tighter md:text-[8rem] md:leading-[0.9]">
          <span className="block">Social Media</span>
          <span className="mt-2 block bg-gradient-to-r from-[#03fce8] via-[#7ec8c0] to-[#fe2f55] bg-clip-text text-transparent">
            op Autopilot
          </span>
        </h1>
        <p className="mx-auto mt-6 max-w-3xl text-lg text-white/60 md:text-2xl">
          Laat AI je contentkalender vullen, perfecte posts genereren en automatisch publiceren op Facebook,
          Instagram en LinkedIn. <span className="font-semibold text-[#03fce8]">10x sneller</span>, altijd
          on-brand.
        </p>
        <div className="mt-8 flex justify-center">
          <Link
            href="/login?tab=signup"
            className={cn(
              buttonVariants({ size: "lg" }),
              "h-12 rounded-xl bg-[#fe2f55] px-8 text-base text-white shadow-[0_0_40px_rgba(254,47,85,0.45)] hover:bg-[#fe2f55]/90"
            )}
          >
            Start met 30 Credits Gratis
            <ArrowRight data-icon="inline-end" />
          </Link>
        </div>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-5 text-sm text-white/50">
          {["Geen creditcard", "30 gratis credits", "Setup in 2 min", "Direct te gebruiken"].map((item) => (
            <span key={item} className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-[#03fce8]" />
              {item}
            </span>
          ))}
        </div>
      </section>

      <section className="relative z-10 mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-2">
        <div>
          <h2 className="text-4xl font-bold md:text-5xl">
            Sluit aan bij <span className="text-[#03fce8]">500+</span> bedrijven
          </h2>
          <p className="mt-4 text-lg text-white/70">
            Die hun social media marketing al hebben geautomatiseerd met Top Noise. Van zelfstandigen tot
            marketingteams — iedereen bespaart tijd en verhoogt engagement.
          </p>
          <Link
            href="/login?tab=signup"
            className={cn(buttonVariants({ size: "lg" }), "mt-6 bg-[#fe2f55] text-white hover:bg-[#fe2f55]/90")}
          >
            Start Nu Gratis
          </Link>
        </div>
        <div className="relative">
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-[#fe2f55]/30 to-[#03fce8]/30 blur-2xl" />
          <Image
            src="/brand/diverse-team.jpg"
            alt="Team werkt samen aan social media"
            width={900}
            height={600}
            className="relative w-full rounded-3xl object-cover shadow-2xl"
          />
        </div>
      </section>

      <section className="relative z-10 mx-auto grid max-w-5xl gap-6 px-4 py-16 md:grid-cols-3">
        {[
          { value: "500+", label: "Tevreden gebruikers" },
          { value: "10K+", label: "Posts gegenereerd" },
          { value: "95%", label: "Tijd bespaard" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center">
            <p className="bg-gradient-to-r from-[#fe2f55] to-[#03fce8] bg-clip-text text-6xl font-black text-transparent">
              {stat.value}
            </p>
            <p className="mt-3 text-lg text-white/70">{stat.label}</p>
          </div>
        ))}
      </section>

      <section className="relative z-10 px-4 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <h2 className="text-4xl font-bold md:text-6xl">
              Alles wat je <span className="text-[#fe2f55]">nodig hebt</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-white/60">
              Van inspiratie tot publicatie, volledig geautomatiseerd met kunstmatige intelligentie
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} className="rounded-2xl border border-white/10 bg-white/5 p-6">
                  <div
                    className={`mb-5 flex size-14 items-center justify-center rounded-2xl ${
                      feature.accent ? "bg-[#03fce8] text-[#010001]" : "bg-[#fe2f55] text-white"
                    }`}
                  >
                    <Icon className="size-7" />
                  </div>
                  <h3 className="text-lg font-bold">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/60">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto grid max-w-5xl gap-6 px-4 py-8 md:grid-cols-3">
        {[
          { value: "10x", label: "Sneller content maken" },
          { value: "3+", label: "Platforms ondersteund" },
          { value: "95%", label: "Tijd bespaard" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
            <p className="bg-gradient-to-r from-[#fe2f55] to-[#03fce8] bg-clip-text text-5xl font-black text-transparent">
              {stat.value}
            </p>
            <p className="mt-3 text-lg text-white/70">{stat.label}</p>
          </div>
        ))}
      </section>

      <section className="relative z-10 mx-auto grid max-w-6xl items-center gap-10 px-4 py-20 md:grid-cols-2">
        <Image
          src="/brand/team-collaboration.jpg"
          alt="Samenwerken aan een contentstrategie"
          width={900}
          height={700}
          className="w-full rounded-2xl object-cover shadow-2xl"
        />
        <div>
          <h2 className="text-4xl font-bold md:text-5xl">
            Zo <span className="text-[#03fce8]">werkt het</span>
          </h2>
          <p className="mt-3 text-white/60">In 4 simpele stappen naar consistente social media marketing</p>
          <ol className="mt-8 space-y-6">
            {steps.map((step, index) => (
              <li key={step.title} className="flex gap-4">
                <span
                  className={`flex size-12 shrink-0 items-center justify-center rounded-2xl text-xl font-bold ${
                    index % 2 === 0 ? "bg-[#fe2f55] text-white" : "bg-[#03fce8] text-[#010001]"
                  }`}
                >
                  {index + 1}
                </span>
                <div>
                  <h3 className="text-xl font-bold">{step.title}</h3>
                  <p className="mt-1 text-white/60">{step.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="relative z-10 px-4 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <h2 className="text-4xl font-black md:text-5xl">Simpele, transparante prijzen</h2>
            <p className="mx-auto mt-4 max-w-2xl text-white/70">
              Koop alleen credits wanneer je ze nodig hebt. Geen verplichtingen, geen verborgen kosten.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`flex flex-col border bg-[#010001] p-7 ${
                  plan.popular ? "border-[#fe2f55]" : "border-white/10"
                }`}
              >
                {plan.popular ? (
                  <p className="-mt-10 mb-4 self-center bg-[#fe2f55] px-3 py-1 text-xs font-bold">POPULAIR</p>
                ) : null}
                <h3 className="text-2xl font-bold">{plan.name}</h3>
                <p className="mt-3 text-5xl font-black">{plan.price}</p>
                <p className="mt-3 font-semibold text-white/70">{plan.credits}</p>
                <p className="text-sm text-white/50">{plan.note}</p>
                <ul className="mt-6 flex-1 space-y-2 text-sm text-white/70">
                  {plan.items.map((item) => (
                    <li key={item} className="flex gap-2">
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#03fce8]" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/login?tab=signup"
                  className={cn(buttonVariants(), "mt-6 w-full bg-[#fe2f55] text-white hover:bg-[#fe2f55]/90")}
                >
                  {plan.price === "€0" ? "Gratis starten" : "Koop nu"}
                </Link>
              </div>
            ))}
          </div>
          <p className="mt-8 text-center text-white/50">
            Alle pakketten zijn eenmalige aankopen. Credits verlopen niet en kunnen worden gebruikt wanneer je wilt.
          </p>
          <p className="mt-3 text-center text-sm text-white/40">
            Checkout volgt; je kunt nu al een account aanmaken.
          </p>
        </div>
      </section>

      <section className="relative z-10 px-4 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <h2 className="text-4xl font-black md:text-5xl">Bereken jouw ROI winst</h2>
            <p className="mx-auto mt-4 max-w-2xl text-white/70">
              Zie direct hoeveel tijd en geld je bespaart met Top Noise
            </p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
            <h3 className="text-2xl font-bold">Case Study: Lokale KMO</h3>
            <p className="mt-2 text-white/60">
              Een lokaal bedrijf met 10 medewerkers wil 2 posts per week publiceren op Facebook, Instagram en
              LinkedIn
            </p>
            <div className="mt-8 grid gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-[#010001] p-6">
                <h4 className="text-xl font-bold">Zonder Top Noise</h4>
                <ul className="mt-4 space-y-2 text-sm text-white/70">
                  <li className="flex justify-between gap-4">
                    <span>Content bedenken</span>
                    <span>2u/week</span>
                  </li>
                  <li className="flex justify-between gap-4">
                    <span>Posts schrijven (3 platforms)</span>
                    <span>3u/week</span>
                  </li>
                  <li className="flex justify-between gap-4">
                    <span>Plannen &amp; publiceren</span>
                    <span>1u/week</span>
                  </li>
                  <li className="flex justify-between gap-4">
                    <span>Grafisch ontwerp</span>
                    <span>€150/maand</span>
                  </li>
                </ul>
                <p className="mt-6 text-3xl font-black">24 uur + €150</p>
                <p className="mt-2 text-sm text-white/50">Bij €50/uur = €1.200 + €150 = €1.350/maand</p>
              </div>
              <div className="rounded-2xl border border-[#03fce8]/40 bg-[#010001] p-6">
                <p className="mb-2 text-xs font-bold tracking-widest text-[#03fce8]">BESPARING</p>
                <h4 className="text-xl font-bold">Met Top Noise</h4>
                <ul className="mt-4 space-y-2 text-sm text-white/70">
                  <li className="flex justify-between gap-4">
                    <span>Posts reviewen &amp; aanpassen</span>
                    <span>1u/week</span>
                  </li>
                  <li className="flex justify-between gap-4">
                    <span>AI genereert alles</span>
                    <span>Automatisch</span>
                  </li>
                  <li className="flex justify-between gap-4">
                    <span>Visual briefs inbegrepen</span>
                    <span>Gratis</span>
                  </li>
                  <li className="flex justify-between gap-4">
                    <span>Top Noise (8 posts/maand)</span>
                    <span>€49-149/maand</span>
                  </li>
                </ul>
                <p className="mt-6 text-3xl font-black">4 uur + €49-149</p>
                <p className="mt-2 text-sm text-white/50">Bij €50/uur = €200 + €149 = €349/maand</p>
              </div>
            </div>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {[
                { value: "83%", label: "Minder tijd nodig", note: "20 uur bespaard" },
                { value: "€1.001", label: "Besparing per maand", note: "€12.012 per jaar" },
                { value: "3x", label: "Meer output", note: "24+ posts/maand mogelijk" },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-white/10 p-5 text-center">
                  <p className="text-3xl font-black text-[#03fce8]">{item.value}</p>
                  <p className="mt-1 font-semibold">{item.label}</p>
                  <p className="text-sm text-white/50">{item.note}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-6xl px-4 py-20">
        <h2 className="mb-10 text-center text-4xl font-bold">Wat gebruikers zeggen</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {testimonials.map((item) => (
            <figure key={item.name} className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <p className="text-white/80">&ldquo;{item.quote}&rdquo;</p>
              <figcaption className="mt-6 flex items-center gap-3">
                <Image
                  src={item.image}
                  alt={item.name}
                  width={48}
                  height={48}
                  className="size-12 rounded-full object-cover"
                />
                <div>
                  <p className="font-semibold">{item.name}</p>
                  <p className="text-sm text-white/50">{item.role}</p>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="relative z-10 px-4 py-24 text-center">
        <h2 className="text-4xl font-black md:text-5xl">Klaar om te beginnen?</h2>
        <p className="mx-auto mt-4 max-w-xl text-white/60">
          Start vandaag nog met 30 gratis credits. Geen creditcard nodig, geen verplichtingen.
        </p>
        <Link
          href="/login?tab=signup"
          className={cn(buttonVariants({ size: "lg" }), "mt-8 h-12 bg-[#fe2f55] px-8 text-white hover:bg-[#fe2f55]/90")}
        >
          Start Nu Gratis
        </Link>
      </section>

      <footer className="relative z-10 border-t border-white/10 px-4 py-8">
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

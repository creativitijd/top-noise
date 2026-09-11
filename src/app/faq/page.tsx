import type { Metadata } from "next";
import { LegalArticle } from "@/components/marketing/marketing-chrome";

export const metadata: Metadata = {
  title: "FAQ | Top Noise",
  description: "Veelgestelde vragen over Top Noise en het koppelen van social media accounts.",
};

export default function FaqPage() {
  return (
    <LegalArticle title="Veelgestelde Vragen">
      <p>
        Alles wat je moet weten over het koppelen van je social media accounts en het gebruik van Top Noise.
      </p>

      <h2>Ondersteunde account types</h2>
      <h3>Facebook</h3>
      <ul>
        <li>Facebook Pagina&apos;s (bedrijfspagina&apos;s) — ondersteund</li>
        <li>Persoonlijke profielen — niet mogelijk via de API van Meta</li>
      </ul>
      <h3>Instagram</h3>
      <ul>
        <li>Business- en Creator-accounts — ondersteund</li>
        <li>Persoonlijke accounts — niet mogelijk via de API</li>
        <li>Vereist een gekoppelde Facebook Pagina via Meta Business Suite</li>
      </ul>
      <h3>LinkedIn</h3>
      <ul>
        <li>Persoonlijke profielen — ondersteund</li>
        <li>Bedrijfspagina&apos;s — nog niet ondersteund, staat op de roadmap</li>
      </ul>

      <h2>Algemeen</h2>
      <h3>Wat zijn credits?</h3>
      <p>
        Credits zijn eenmalige tegoeden voor AI-generatie. Ze verlopen niet. Checkout volgt; je kunt nu al een
        account aanmaken en de kalender gebruiken.
      </p>
      <h3>Hoe plan ik een post in?</h3>
      <p>
        Open een project, ga naar de kalender en laat AI een maandplan maken of voeg zelf een post toe. Keur
        goed; publicatie gebeurt server-side op het geplande moment.
      </p>
      <h3>Kan ik direct publiceren?</h3>
      <p>Ja. Keur een post goed met publicatietijd nu of in het verleden, dan gaat de worker hem meteen uit.</p>
      <h3>Nog vragen?</h3>
      <p>
        Mail ons op{" "}
        <a className="text-[#03fce8] hover:underline" href="mailto:info@top-noise.com">
          info@top-noise.com
        </a>
        .
      </p>
    </LegalArticle>
  );
}

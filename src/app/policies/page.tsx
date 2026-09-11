import type { Metadata } from "next";
import { LegalArticle } from "@/components/marketing/marketing-chrome";

export const metadata: Metadata = {
  title: "Voorwaarden | Top Noise",
  description: "Algemene voorwaarden voor het gebruik van Top Noise.",
};

export default function PoliciesPage() {
  return (
    <LegalArticle title="Algemene voorwaarden">
      <p>Laatst bijgewerkt: 11 september 2026</p>
      <h2>1. Dienst</h2>
      <p>
        Top Noise is een platform voor het plannen, genereren, goedkeuren en publiceren van social content. Door
        een account aan te maken ga je akkoord met deze voorwaarden.
      </p>
      <h2>2. Account</h2>
      <p>
        Je bent verantwoordelijk voor de juistheid van je gegevens en voor het geheimhouden van je
        inloggegevens. Je mag het platform niet gebruiken voor onwettige of misleidende content.
      </p>
      <h2>3. Content en publicatie</h2>
      <p>
        Jij blijft eigenaar van je merkcontent. AI-voorstellen zijn hulpmiddelen: jij keurt goed voordat iets
        live gaat. Top Noise is niet verantwoordelijk voor content die jij laat publiceren.
      </p>
      <h2>4. Credits en betalingen</h2>
      <p>
        Pakketten op de site zijn eenmalige aankopen; credits verlopen niet. Online checkout volgt. Tot die tijd
        kun je een account aanmaken en de productfuncties gebruiken die beschikbaar zijn.
      </p>
      <h2>5. Beschikbaarheid</h2>
      <p>
        Wij streven naar een stabiele dienst, maar kunnen geen ononderbroken beschikbaarheid garanderen.
        Gekoppelde platforms (Meta, LinkedIn, WordPress) kunnen hun API wijzigen.
      </p>
      <h2>6. Aansprakelijkheid</h2>
      <p>
        Voor zover wettelijk toegestaan is Top Noise niet aansprakelijk voor indirecte schade, gederfde winst of
        storingen bij derde platforms.
      </p>
      <h2>7. Contact</h2>
      <p>
        Vragen:{" "}
        <a className="text-[#03fce8] hover:underline" href="mailto:info@top-noise.com">
          info@top-noise.com
        </a>
      </p>
    </LegalArticle>
  );
}

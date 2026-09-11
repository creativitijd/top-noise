import type { Metadata } from "next";
import { LegalArticle } from "@/components/marketing/marketing-chrome";

export const metadata: Metadata = {
  title: "Privacybeleid | Top Noise",
  description: "Hoe Top Noise persoonlijke gegevens verzamelt, gebruikt en beschermt.",
};

export default function PrivacyPage() {
  return (
    <LegalArticle title="Privacybeleid">
      <p>Laatst bijgewerkt: 11 september 2026</p>
      <h2>1. Inleiding</h2>
      <p>
        Welkom bij Top Noise. Wij respecteren je privacy en zetten ons in om je persoonlijke gegevens te
        beschermen. Dit beleid legt uit hoe wij informatie verzamelen, gebruiken en beschermen wanneer je onze
        diensten gebruikt.
      </p>
      <h2>2. Gegevens die wij verzamelen</h2>
      <ul>
        <li>Accountgegevens: naam, e-mailadres en wachtwoord wanneer je een account aanmaakt.</li>
        <li>
          Bedrijfsgegevens: bedrijfsnaam, industrie, doelgroep en merkstijl die je invoert voor
          gepersonaliseerde content.
        </li>
        <li>
          Social media toegang: wanneer je accounts koppelt (Facebook, Instagram, LinkedIn, WordPress), ontvangen
          wij toegangstokens om namens jou te publiceren.
        </li>
        <li>Gebruiksgegevens: gegenereerde posts, publicatiegeschiedenis en analysecijfers.</li>
      </ul>
      <h2>3. Hoe wij je gegevens gebruiken</h2>
      <ul>
        <li>Het leveren en verbeteren van onze diensten</li>
        <li>Het genereren van gepersonaliseerde social media content</li>
        <li>Het publiceren van goedgekeurde posts op gekoppelde accounts</li>
        <li>Belangrijke meldingen en klantenondersteuning</li>
      </ul>
      <h2>4. Social media-integraties</h2>
      <ul>
        <li>Wij vragen alleen de minimale permissies om content te publiceren.</li>
        <li>Wachtwoorden van social platforms slaan wij niet op — alleen veilige OAuth-tokens of app-passwords.</li>
        <li>Je kunt accounts op elk moment ontkoppelen via de projectinstellingen.</li>
        <li>Wij publiceren alleen content die je expliciet hebt goedgekeurd.</li>
      </ul>
      <h2>5. Gegevensbeveiliging</h2>
      <ul>
        <li>Versleuteling tijdens overdracht (SSL/TLS)</li>
        <li>Veilige opslag van toegangstokens</li>
        <li>Beperkte toegang tot persoonlijke gegevens</li>
      </ul>
      <h2>6. Delen van gegevens</h2>
      <p>
        Wij verkopen je persoonlijke gegevens niet. Wij delen alleen met social platforms om te publiceren (met
        jouw toestemming), met dienstverleners die de dienst mogelijk maken, of wanneer wettelijk vereist.
      </p>
      <h2>7. Je rechten (AVG)</h2>
      <p>
        Je hebt recht op inzage, rectificatie, verwijdering, bezwaar en dataportabiliteit. Mail{" "}
        <a className="font-semibold text-[#3f6b2b] hover:underline" href="mailto:info@top-noise.com">
          info@top-noise.com
        </a>
        .
      </p>
      <h2>8. Cookies</h2>
      <p>
        Wij gebruiken essentiële cookies voor login en sessies. Geen trackingcookies voor advertenties.
      </p>
      <h2>9. Bewaartermijnen</h2>
      <p>
        Wij bewaren gegevens zolang je account actief is. Na verwijdering wissen wij gegevens binnen 30 dagen,
        tenzij wettelijk anders vereist.
      </p>
      <h2>10. Contact</h2>
      <p>
        E-mail:{" "}
        <a className="font-semibold text-[#3f6b2b] hover:underline" href="mailto:info@top-noise.com">
          info@top-noise.com
        </a>
      </p>
    </LegalArticle>
  );
}

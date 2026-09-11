import type { Metadata } from "next";
import { Bricolage_Grotesque, Plus_Jakarta_Sans } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const sans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
});

const heading = Bricolage_Grotesque({
  variable: "--font-heading",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Top Noise - Een maand social media, in één middag geregeld",
  description:
    "Top Noise maakt je maandplan, schrijft de posts per platform en zet ze zelf online. Jij kijkt het na met een koffie erbij.",
  keywords: [
    "social media planning",
    "contentkalender",
    "AI content",
    "Facebook",
    "Instagram",
    "LinkedIn",
    "Top Noise",
  ],
  icons: {
    icon: "/favicon.jpg",
    apple: "/logo.jpg",
  },
  openGraph: {
    title: "Top Noise - Een maand social media, in één middag geregeld",
    description:
      "Maandplan, posts per platform en automatisch publiceren. Geen kaart nodig.",
    type: "website",
    url: "https://top-noise.com",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="nl" className={`${sans.variable} ${heading.variable} h-full`}>
      <body className={`${sans.className} flex min-h-full flex-col bg-background text-foreground`}>
        <TooltipProvider>
          {children}
          <Toaster />
        </TooltipProvider>
      </body>
    </html>
  );
}

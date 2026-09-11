import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const sans = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Top Noise - AI-Powered Social Media op Autopilot",
  description:
    "Genereer maandplannen, creëer platform-specifieke content en publiceer automatisch. Social media op autopilot met AI.",
  keywords: [
    "social media planning",
    "content calendar",
    "AI content generation",
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
    title: "Top Noise - Social Media op Autopilot",
    description:
      "Genereer maandplannen, creëer platform-specifieke content en publiceer automatisch.",
    type: "website",
    url: "https://top-noise.com",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="nl"
      className={`${sans.variable} h-full antialiased`}
    >
      <body className={`${sans.className} flex min-h-full flex-col bg-background text-foreground`}>
        <TooltipProvider>
          {children}
          <Toaster />
        </TooltipProvider>
      </body>
    </html>
  );
}

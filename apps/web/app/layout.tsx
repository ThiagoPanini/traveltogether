import type { Metadata } from "next";
import { DM_Mono, Hanken_Grotesk, Space_Grotesk } from "next/font/google";
import "./globals.css";

// Chassi Espresso (ADR-0020): três famílias via next/font, expostas como CSS
// vars consumidas em globals.css. Space Grotesk = display; Hanken = corpo;
// DM Mono = rótulo/dado de viagem.
const display = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

const body = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

const mono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "traveltogether",
  description: "Hub de organização de viagens em grupo.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}

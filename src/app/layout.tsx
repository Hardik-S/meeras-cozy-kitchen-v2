import type { Metadata } from "next";
import localFont from "next/font/local";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { MotionObserver } from "@/components/motion-observer";
import "./globals.css";

const nunito = localFont({
  src: "./fonts/Nunito-Variable.ttf",
  variable: "--font-sans",
  weight: "200 1000",
  display: "swap"
});

export const metadata: Metadata = {
  title: {
    default: "Meera's Cozy Kitchen",
    template: "%s | Meera's Cozy Kitchen"
  },
  description:
    "Mobile-first home bakery site for custom celebration cakes in Brampton.",
  metadataBase: new URL("https://meeras-cozy-kitchen-v2.vercel.app"),
  icons: {
    icon: "/meeras-logo.jpg",
    apple: "/meeras-logo.jpg"
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={nunito.variable} data-scroll-behavior="smooth">
      <body>
        <MotionObserver />
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <div className="page-shell">
          <SiteHeader />
          <main id="main">{children}</main>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { szalon } from "@/lib/salon";
import DemoSav from "@/components/DemoSav";

// "latin-ext" kell a magyar ő és ű betűkhöz
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "latin-ext"],
});

// Ez jelenik meg a böngészőfülön és a Google-találatokban
export const metadata: Metadata = {
  title: `${szalon.nev} – Online időpontfoglalás`,
  description: "Foglalj időpontot online manikűrre, gél lakkra, műkörömre.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="hu"
      // Jelzi a Next.js-nek, hogy a finom görgetés szándékos (oldalváltáskor kikapcsolja)
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <DemoSav />
        {children}
      </body>
    </html>
  );
}

import type { CSSProperties, ReactNode } from "react";
import type { Metadata } from "next";
import { Outfit, Work_Sans } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

const workSans = Work_Sans({
  subsets: ["latin"],
  variable: "--font-work-sans",
});

export const metadata: Metadata = {
  title: "Analítica Web · Adereso",
  description: "Dashboards GA4: páginas, tráfico, formularios, conversiones y embudos.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${outfit.variable} ${workSans.variable} h-full`}
    >
      <body
        className="min-h-full antialiased"
        style={{ backgroundColor: "#0C0C0D" } as CSSProperties}
      >
        {children}
      </body>
    </html>
  );
}

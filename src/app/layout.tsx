import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/design-system/tokens.css";
import "./globals.css";

// Inter, the design system's typeface, self-hosted by next/font. Its variable
// (--font-inter) feeds --ds-font-inter, which every text style uses.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Candle Runner",
  description: "The game in Tradl's backtest chat while a run computes.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-theme="dark" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}

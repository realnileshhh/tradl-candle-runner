import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeScript } from "@/components/theme-script/theme-script";
import "@/design-system/tokens.css";
import "./globals.css";

// Inter, the design system's typeface, self-hosted by next/font. Its variable
// (--font-inter) feeds --ds-font-inter, which every text style uses.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Candle Runner",
  description: "The game in Tradl's backtest chat while a run computes.",
};

// Dark is the default mode. The script in <head> switches <html> to the chosen
// mode before the first paint, so React must accept the attribute it finds there.
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-theme="dark" className={inter.variable} suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body>{children}</body>
    </html>
  );
}

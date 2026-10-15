import type { Metadata } from "next";
import { Play } from "./play";

export const metadata: Metadata = { title: "Candle Runner · play" };

// The game alone, as the one-file build shows it: the verification suite runs here.
export default function PlayPage() {
  return <Play />;
}

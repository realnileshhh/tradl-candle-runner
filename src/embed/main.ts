// The one-file build's entry (scripts/build-embed.mjs bundles it into
// public/candle-runner-loading.html). Same engine and stylesheet as the React
// component; this file only boots it in a page of its own.

import "@/design-system/tokens.css";
import "@/game/tokens.css";
import "./page.css";
import styles from "@/game/candle-runner.module.css";
import { constants, mount, type CandleRunnerClasses } from "@/game";

const classes = styles as unknown as CandleRunnerClasses;

window.CandleRunner = {
  mount: (host, opts = {}) => mount(host, { ...opts, classes }),
  constants,
};

const params = new URLSearchParams(location.search);
const inFrame = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();
if (inFrame || params.get("embed") === "1") document.documentElement.classList.add("cr-embed");

// The host's mode is the whole page's, not only the game's: ?theme=light or
// ?theme=dark on load, { type: "cr:theme", theme } after. The page's
// color-scheme must match the host's, or the browser paints an opaque backdrop
// behind the frame instead of letting the host's page show through.
const setPageTheme = (theme: unknown) => {
  if (theme === "light" || theme === "dark") document.documentElement.dataset.theme = theme;
};
setPageTheme(params.get("theme"));
window.addEventListener("message", (e) => {
  const d = e.data as { type?: unknown; theme?: unknown } | null;
  if (d && typeof d === "object" && d.type === "cr:theme") setPageTheme(d.theme);
});

const host = document.getElementById("cr-root");
if (host && !params.has("nomount")) window.candleRunner = window.CandleRunner.mount(host, { keys: "window" });

"use client";

// The page's colour mode: the design system's Dark (the default the layout writes)
// or Light, on <html data-theme>. An inline script in <head> applies the chosen
// mode while the HTML is parsed, so a light page never paints dark first (Next's
// guide "Preventing flash before hydration", section Themes). The game follows
// <html> by itself; only a frame needs telling (the review page posts cr:theme).

import { useLayoutEffect, useSyncExternalStore } from "react";
import type { Theme } from "@/game";

/** Where the review page keeps the user's choice. */
const STORAGE_KEY = "cr-review-theme";

// ?theme=light or ?theme=dark first, so a link (a screenshot, the suite) opens a
// mode; then the saved choice; else the markup's Dark stands. Plain ES5: it runs
// before any bundle. preferredTheme() below is the same rule for React.
const SCRIPT = `(function(){var t;try{t=new URLSearchParams(location.search).get("theme")}catch(e){}if(t!=="light"&&t!=="dark"){try{t=localStorage.getItem("${STORAGE_KEY}")}catch(e){}}if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)})()`;

const isTheme = (value: unknown): value is Theme => value === "light" || value === "dark";

function preferredTheme(): Theme {
  const asked = new URLSearchParams(window.location.search).get("theme");
  if (isTheme(asked)) return asked;
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (isTheme(saved)) return saved;
  } catch {}
  return "dark";
}

const readTheme = (): Theme => (document.documentElement.dataset.theme === "light" ? "light" : "dark");
const serverTheme = (): Theme => "dark";

function subscribe(onChange: () => void) {
  const watch = new MutationObserver(onChange);
  watch.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => watch.disconnect();
}

/**
 * The page's mode as <html data-theme> holds it. Hydration renders Dark, as the
 * server did, and React renders again at once with what the script applied: the
 * radio buttons never mismatch the server's HTML, which the script doesn't touch.
 */
export function usePageTheme(): Theme {
  return useSyncExternalStore(subscribe, readTheme, serverTheme);
}

/** Switches the page's mode and keeps it for the next visit. */
export function setPageTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {}
}

/** Goes in the root layout's <head>, which carries data-theme="dark" and suppressHydrationWarning. */
export function ThemeScript() {
  // In development React's Strict Mode remounts the root and resets <html> to the
  // layout's own attributes (Dark): apply the choice again before paint. In
  // production the script has already applied it, so this changes nothing.
  useLayoutEffect(() => {
    const theme = preferredTheme();
    if (document.documentElement.dataset.theme !== theme) document.documentElement.dataset.theme = theme;
  }, []);

  return (
    <script
      // The server's HTML runs it during parsing. React never runs a script it
      // renders on the client (and warns about one), so the client renders it inert.
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: SCRIPT }}
    />
  );
}

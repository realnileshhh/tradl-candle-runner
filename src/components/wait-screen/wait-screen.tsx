"use client";

// The backtest chat's wait screen, rebuilt for review: the step line, the game
// below it in the chat column, and the host's side of the contract (PRD
// sections 5 and 7). The game mounts inline (the React component) or in an
// iframe (the one-file build, sandboxed as the product will run it). The colour
// mode switch shows both of the design system's modes, Dark and Light.

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { IconLoader2, IconMoon, IconSun } from "@tabler/icons-react";
import { CandleRunner, type CandleRunnerControls } from "@/components/candle-runner/candle-runner";
import { Icon } from "@/components/icon/icon";
import { setPageTheme, usePageTheme } from "@/components/theme-script/theme-script";
import type { CandleRunnerEvent, EventData, Theme } from "@/game";
import styles from "./wait-screen.module.css";

type Mount = "inline" | "iframe";
type Status = "running" | "ready" | "left";

interface LoggedEvent {
  id: number;
  at: string;
  name: CandleRunnerEvent;
  data: string;
}

/** The host removes the game this long after its exit starts (PRD section 7). */
const REMOVE_AFTER_MS = 750;
const EMBED_SRC = "/candle-runner-loading.html?embed=1";
const MAX_EVENTS = 14;

export function WaitScreen() {
  const theme = usePageTheme();
  const [mount, setMount] = useState<Mount>("inline");
  // The mode a run's frame opened in: its address carries it, so it never changes
  // while the run lasts (a new address would reload the frame and restart the game).
  const [frameTheme, setFrameTheme] = useState<Theme>("dark");
  const [status, setStatus] = useState<Status>("running");
  const [showGame, setShowGame] = useState(true);
  const [run, setRun] = useState(1);
  const [frameHeight, setFrameHeight] = useState(439);
  const [events, setEvents] = useState<LoggedEvent[]>([]);
  const controls = useRef<CandleRunnerControls>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const pending = useRef<Status | null>(null);
  const removeTimer = useRef(0);
  const runStartedAt = useRef(0);
  const seq = useRef(0);

  function onGameEvent(name: CandleRunnerEvent, data: EventData) {
    if (name === "size") {
      if (typeof data.height === "number") setFrameHeight(data.height);
      return;
    }
    const seconds = (performance.now() - runStartedAt.current) / 1000;
    const entry = { id: ++seq.current, at: `${seconds.toFixed(1)}s`, name, data: JSON.stringify(data) };
    setEvents((list) => [entry, ...list].slice(0, MAX_EVENTS));
    if (name === "dismissed") {
      // null when the player chose "Skip the game": the run goes on without it.
      const next = pending.current;
      pending.current = null;
      removeTimer.current = window.setTimeout(() => {
        setShowGame(false);
        if (next) setStatus(next);
      }, REMOVE_AFTER_MS);
    }
  }
  const onFrameEvent = useEffectEvent(onGameEvent);

  useEffect(() => {
    runStartedAt.current = performance.now();
    return () => window.clearTimeout(removeTimer.current);
  }, [run]);

  // The one-file build talks to its host by postMessage.
  useEffect(() => {
    if (mount !== "iframe") return;
    const onMessage = (e: MessageEvent) => {
      if (e.source !== frame.current?.contentWindow) return;
      const message = e.data as { source?: string; event?: CandleRunnerEvent; data?: EventData } | null;
      if (message?.source !== "candle-runner" || !message.event) return;
      onFrameEvent(message.event, message.data ?? {});
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [mount]);

  function finish(next: Exclude<Status, "running">) {
    if (!showGame) {
      setStatus(next);
      return;
    }
    pending.current = next;
    if (mount === "inline") void controls.current?.dismiss();
    else frame.current?.contentWindow?.postMessage(next === "ready" ? "cr:results" : "cr:dismiss", "*");
  }

  function newRun(nextMount: Mount = mount) {
    window.clearTimeout(removeTimer.current);
    pending.current = null;
    setMount(nextMount);
    setFrameTheme(theme);
    setStatus("running");
    setShowGame(true);
    setEvents([]);
    setRun((r) => r + 1);
  }

  // The inline game follows <html> by itself. The frame is a document of its own:
  // it opened in frameTheme and hears every switch after that as a message.
  function chooseTheme(next: Theme) {
    setPageTheme(next);
    frame.current?.contentWindow?.postMessage({ type: "cr:theme", theme: next }, "*");
  }

  // A switch made while the frame was still loading arrived before it listened.
  function onFrameLoad() {
    if (theme !== frameTheme) frame.current?.contentWindow?.postMessage({ type: "cr:theme", theme }, "*");
  }

  return (
    <div className={styles.page}>
      <header className={styles.bar}>
        <p className={styles.title}>
          Candle Runner <span className={styles.tag}>Review</span>
        </p>
        <div className={styles.controls}>
          <div className={styles.segmented} role="radiogroup" aria-label="Mount the game">
            {(["inline", "iframe"] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={mount === m}
                className={styles.segment}
                onClick={() => newRun(m)}
              >
                {m === "inline" ? "Inline" : "Iframe"}
              </button>
            ))}
          </div>
          <div className={styles.segmented} role="radiogroup" aria-label="Colour mode">
            {(["dark", "light"] as const).map((t) => {
              // The design system has no sun or moon icon, so these are Tabler's.
              const ModeIcon = t === "dark" ? IconMoon : IconSun;
              return (
                <button
                  key={t}
                  type="button"
                  role="radio"
                  aria-checked={theme === t}
                  className={styles.segment}
                  onClick={() => chooseTheme(t)}
                >
                  <ModeIcon className={styles.segmentIcon} aria-hidden="true" />
                  {t === "dark" ? "Dark" : "Light"}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            className={styles.primary}
            disabled={status !== "running"}
            onClick={() => finish("ready")}
          >
            Report ready
          </button>
          <button
            type="button"
            className={styles.button}
            disabled={status !== "running"}
            onClick={() => finish("left")}
          >
            Leave conversation
          </button>
          <button type="button" className={styles.button} onClick={() => newRun()}>
            New run
          </button>
        </div>
      </header>

      <main className={styles.column}>
        <p className={styles.step} data-status={status}>
          {status === "ready" ? (
            <Icon name="icon-circle-check" className={styles.check} />
          ) : (
            <IconLoader2 className={styles.spinner} aria-hidden="true" />
          )}
          {status === "ready" ? "Backtest ready" : "Preparing your equity strategy"}
        </p>
        {showGame &&
          (mount === "inline" ? (
            <CandleRunner key={run} ref={controls} onEvent={onGameEvent} />
          ) : (
            <iframe
              key={run}
              ref={frame}
              src={`${EMBED_SRC}&theme=${frameTheme}`}
              title="Candle Runner"
              sandbox="allow-scripts"
              className={styles.frame}
              style={{ height: frameHeight }}
              onLoad={onFrameLoad}
            />
          ))}
      </main>

      <section className={styles.log} aria-label="Events from the game">
        <p className={styles.logTitle}>Events</p>
        <ol className={styles.list}>
          {events.map((e) => (
            <li key={e.id} className={styles.entry}>
              <span className={styles.at}>{e.at}</span>
              <span className={styles.name}>{e.name}</span>
              <span className={styles.data}>{e.data}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

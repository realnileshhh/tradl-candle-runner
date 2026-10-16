"use client";

// <CandleRunner />: the game for a React host. A thin wrapper: the engine
// (src/game) owns the canvas and its DOM, so this component and the one-file
// build run the same code. Mount it below the step line in the chat column.

import { useEffect, useEffectEvent, useImperativeHandle, useRef, type Ref } from "react";
import "@/design-system/tokens.css";
import "@/game/tokens.css";
import styles from "@/game/candle-runner.module.css";
import {
  mount,
  type CandleRunnerClasses,
  type CandleRunnerEvent,
  type CandleRunnerHandle,
  type EventData,
  type Theme,
} from "@/game";

/** What a host can do with a mounted game. It always talks to the game mounted now. */
export type CandleRunnerControls = Pick<CandleRunnerHandle, "dismiss" | "restart" | "setTheme" | "_debugCandles" | "_debugChart">;

export interface CandleRunnerProps {
  /** Show the waiting timer chip. */
  timer?: boolean;
  /** "canvas" (default inline) hears keys only while the canvas has focus; "window" hears them anywhere. */
  keys?: "window" | "canvas";
  /** Local storage key for the high score. */
  storageKey?: string;
  /** The design system mode to draw in. Left out, the game follows the page's own mode. */
  theme?: Theme;
  /** Every event the game posts (PRD section 10). */
  onEvent?: (name: CandleRunnerEvent, data: EventData) => void;
  /** Controls for the host: dismiss() when the user leaves, for example. */
  ref?: Ref<CandleRunnerControls>;
  className?: string;
}

export function CandleRunner({ timer = true, keys, storageKey, theme, onEvent, ref, className }: CandleRunnerProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<CandleRunnerHandle | null>(null);
  const handleEvent = useEffectEvent((name: CandleRunnerEvent, data: EventData) => onEvent?.(name, data));

  useImperativeHandle(
    ref,
    () => ({
      dismiss: () => gameRef.current?.dismiss() ?? Promise.resolve(),
      restart: () => gameRef.current?.restart(),
      setTheme: (next) => gameRef.current?.setTheme(next),
      _debugCandles: () => gameRef.current?._debugCandles() ?? [],
      _debugChart: (startDay: number, n: number) => gameRef.current?._debugChart(startDay, n) ?? [],
    }),
    [],
  );

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const game = mount(host, {
      classes: styles as unknown as CandleRunnerClasses,
      timer,
      keys,
      storageKey,
      onEvent: (name, data) => handleEvent(name, data),
    });
    gameRef.current = game;
    return () => {
      game.destroy();
      gameRef.current = null;
    };
  }, [timer, keys, storageKey]);

  // A new mode is drawn by the game already mounted: no remount, the run goes on.
  useEffect(() => {
    gameRef.current?.setTheme(theme);
  }, [theme, timer, keys, storageKey]);

  return <div ref={hostRef} className={className} />;
}

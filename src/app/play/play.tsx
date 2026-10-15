"use client";

import { useEffect, useRef } from "react";
import { CandleRunner, type CandleRunnerControls } from "@/components/candle-runner/candle-runner";
import styles from "./play.module.css";

export function Play() {
  const controls = useRef<CandleRunnerControls>(null);

  // The same handle the one-file build exposes, so one suite drives both.
  useEffect(() => {
    window.candleRunner = controls.current ?? undefined;
    return () => {
      window.candleRunner = undefined;
    };
  }, []);

  return (
    <main className={styles.play}>
      <CandleRunner ref={controls} keys="window" />
    </main>
  );
}

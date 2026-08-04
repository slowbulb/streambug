"use client";

import { useState } from "react";
import { backfillWaveformAction } from "@/app/actions";
import { analyzeAudioFromUrl } from "@/lib/clientUpload";

type MissingVersion = { id: string; audioUrl: string; trackTitle: string };

/**
 * One-off backfill for versions uploaded before the waveform feature
 * existed: fetches each version's already-stored audio, decodes it
 * client-side the same way a fresh upload would, and saves the result.
 * Runs sequentially (not in parallel) to keep memory/network use sane for
 * a library-sized batch.
 */
export function BackfillWaveforms({ versions }: { versions: MissingVersion[] }) {
  const [remaining, setRemaining] = useState(versions);
  const [running, setRunning] = useState(false);
  const [failed, setFailed] = useState<string[]>([]);
  const total = versions.length;

  async function run() {
    setRunning(true);
    setFailed([]);
    const stillFailed: string[] = [];

    for (const version of versions) {
      try {
        const analysis = await analyzeAudioFromUrl(version.audioUrl);
        if (analysis.waveformPeaks && analysis.waveformPeaks.length > 0) {
          await backfillWaveformAction(version.id, analysis.waveformPeaks);
        } else {
          stillFailed.push(version.trackTitle);
        }
      } catch {
        stillFailed.push(version.trackTitle);
      }
      setRemaining((r) => r.filter((v) => v.id !== version.id));
    }

    setFailed(stillFailed);
    setRunning(false);
  }

  if (total === 0) return null;

  const done = total - remaining.length;

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface px-3 py-2.5 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted">
          {done > 0 && done < total
            ? `Generating waveforms… ${done}/${total}`
            : `${total} version${total === 1 ? "" : "s"} from before waveforms existed.`}
        </p>
        <button
          onClick={run}
          disabled={running || remaining.length === 0}
          className="shrink-0 rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-60"
        >
          {remaining.length === 0 ? "Done" : running ? "Working…" : "Generate waveforms"}
        </button>
      </div>
      {failed.length > 0 && (
        <p className="text-xs text-red-600 dark:text-red-400">
          Couldn&apos;t analyze: {failed.join(", ")}
        </p>
      )}
    </div>
  );
}

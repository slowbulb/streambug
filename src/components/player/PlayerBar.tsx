"use client";

import Link from "next/link";
import { usePlayer } from "@/components/player/PlayerProvider";
import { formatTime } from "@/lib/formatTime";
import { formatVersionLabel } from "@/lib/formatLufs";
import { PauseIcon, PlayIcon } from "@/components/player/icons";

export function PlayerBar() {
  const {
    track,
    activeVersion,
    isPlaying,
    isLoading,
    currentTime,
    duration,
    togglePlay,
    seek,
    switchVersion,
    normalize,
    toggleNormalize,
    normalizeError,
  } = usePlayer();

  if (!track || !activeVersion) return null;

  return (
    <div className="sticky bottom-0 z-20 border-t border-border bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/80">
      {normalizeError && (
        <p className="mx-auto max-w-5xl px-4 pt-2 text-xs text-red-600 dark:text-red-400">
          {normalizeError}
        </p>
      )}
      <div className="mx-auto flex max-w-5xl flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
        <div className="flex min-w-0 items-center gap-3 sm:w-56">
          <button
            onClick={togglePlay}
            aria-label={isPlaying ? "Pause" : "Play"}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground transition hover:opacity-90"
          >
            {isLoading ? (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-accent-foreground border-t-transparent" />
            ) : isPlaying ? (
              <PauseIcon />
            ) : (
              <PlayIcon />
            )}
          </button>
          <div className="min-w-0">
            <Link
              href={`/tracks/${track.id}`}
              className="block truncate text-sm font-medium hover:underline"
            >
              {track.title}
            </Link>
            <p className="truncate text-xs text-muted">
              {track.albumTitle ?? "Single"}
            </p>
          </div>
        </div>

        <div className="flex flex-1 items-center gap-2">
          <span className="w-10 shrink-0 text-right text-xs tabular-nums text-muted">
            {formatTime(currentTime)}
          </span>
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={Math.min(currentTime, duration || 0)}
            onChange={(e) => seek(Number(e.target.value))}
            className="h-1.5 flex-1 accent-accent"
          />
          <span className="w-10 shrink-0 text-xs tabular-nums text-muted">
            {formatTime(duration)}
          </span>
        </div>

        {track.versions.length > 1 && (
          <select
            value={activeVersion.id}
            onChange={(e) => switchVersion(e.target.value)}
            className="shrink-0 rounded-md border border-border bg-surface px-2 py-1.5 text-xs sm:w-32"
            aria-label="Version"
          >
            {track.versions.map((v) => (
              <option key={v.id} value={v.id}>
                {formatVersionLabel(v)}
              </option>
            ))}
          </select>
        )}

        <button
          onClick={toggleNormalize}
          title="Adjust each track's volume to a consistent loudness"
          aria-pressed={normalize}
          className={
            normalize
              ? "shrink-0 rounded-full bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground"
              : "shrink-0 rounded-full border border-border px-3 py-1.5 text-xs hover:bg-background"
          }
        >
          Normalize
        </button>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { usePlayer } from "@/components/player/PlayerProvider";
import { SyncedLyrics } from "@/components/player/SyncedLyrics";
import { PauseIcon, PlayIcon } from "@/components/player/icons";
import { formatTime } from "@/lib/formatTime";
import { formatLufs, formatVersionLabel } from "@/lib/formatLufs";
import type { PlayerTrack } from "@/lib/playerTypes";

export function TrackPlayPanel({ track }: { track: PlayerTrack }) {
  const player = usePlayer();
  const isLive = player.track?.id === track.id;

  const [manualViewId, setManualViewId] = useState(
    track.versions.find((v) => v.isDefault)?.id ?? track.versions[0]?.id,
  );

  // Once this track is the one actually playing, follow whichever version is
  // live so the lyrics on screen always match what's audible; otherwise fall
  // back to whatever the user last picked while just browsing.
  const viewingId = (isLive && player.activeVersionId) || manualViewId;

  const viewing = track.versions.find((v) => v.id === viewingId) ?? track.versions[0];
  if (!viewing) return null;

  function handleSelectVersion(versionId: string) {
    if (isLive) player.switchVersion(versionId);
    else player.playTrack(track, versionId);
    setManualViewId(versionId);
  }

  function handleMainPlay() {
    if (isLive) player.togglePlay();
    else player.playTrack(track, viewingId);
  }

  const displayTime = isLive ? player.currentTime : 0;
  const displayDuration = isLive ? player.duration : viewing.durationSec ?? 0;
  const displayPlaying = isLive && player.isPlaying;
  const displayLoading = isLive && player.isLoading;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <button
          onClick={handleMainPlay}
          aria-label={displayPlaying ? "Pause" : "Play"}
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground transition hover:opacity-90"
        >
          {displayLoading ? (
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-accent-foreground border-t-transparent" />
          ) : displayPlaying ? (
            <PauseIcon className="h-6 w-6" />
          ) : (
            <PlayIcon className="h-6 w-6" />
          )}
        </button>
        <div className="flex-1">
          <input
            type="range"
            min={0}
            max={displayDuration || 0}
            step={0.1}
            value={Math.min(displayTime, displayDuration || 0)}
            disabled={!isLive}
            onChange={(e) => isLive && player.seek(Number(e.target.value))}
            className="h-1.5 w-full accent-accent disabled:opacity-50"
          />
          <div className="mt-1 flex justify-between text-xs tabular-nums text-muted">
            <span>{formatTime(displayTime)}</span>
            <span>
              {formatTime(displayDuration)}
              {formatLufs(viewing.lufs) && ` · ${formatLufs(viewing.lufs)}`}
            </span>
          </div>
        </div>
      </div>

      {track.versions.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {track.versions.map((v) => {
            const isSelected = viewingId === v.id;
            const isPlayingThis = isLive && player.activeVersionId === v.id;
            return (
              <button
                key={v.id}
                onClick={() => handleSelectVersion(v.id)}
                className={
                  isSelected
                    ? "rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground"
                    : "rounded-full border border-border px-3 py-1 text-xs hover:bg-surface"
                }
              >
                {formatVersionLabel(v)}
                {isPlayingThis && player.isPlaying ? " ●" : ""}
              </button>
            );
          })}
        </div>
      )}

      <SyncedLyrics trackId={track.id} versionId={viewing.id} lyrics={viewing.lyrics} />
    </div>
  );
}

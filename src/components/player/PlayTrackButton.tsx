"use client";

import { usePlayer } from "@/components/player/PlayerProvider";
import { PauseIcon, PlayIcon } from "@/components/player/icons";
import type { PlayerTrack } from "@/lib/playerTypes";

export function PlayTrackButton({ track }: { track: PlayerTrack }) {
  const player = usePlayer();
  const isLive = player.track?.id === track.id;
  const isPlaying = isLive && player.isPlaying;

  function handleClick() {
    if (isLive) player.togglePlay();
    else player.playTrack(track);
  }

  return (
    <button
      onClick={handleClick}
      aria-label={isPlaying ? "Pause" : "Play"}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border text-foreground transition hover:border-accent hover:text-accent"
    >
      {isPlaying ? <PauseIcon className="h-3.5 w-3.5" /> : <PlayIcon className="h-3.5 w-3.5" />}
    </button>
  );
}

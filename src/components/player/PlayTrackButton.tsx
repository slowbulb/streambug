"use client";

import { usePlayer } from "@/components/player/PlayerProvider";
import { PauseIcon, PlayIcon } from "@/components/player/icons";
import type { PlayerTrack } from "@/lib/playerTypes";

export function PlayTrackButton({
  track,
  versionId,
  size = "md",
  variant = "circle",
  className = "",
}: {
  track: PlayerTrack;
  /** Play/toggle this specific version rather than the track's default. */
  versionId?: string;
  size?: "sm" | "md";
  /** "circle" (default): bordered round button. "bare": just the icon, for custom-styled contexts. */
  variant?: "circle" | "bare";
  className?: string;
}) {
  const player = usePlayer();
  const isLive = player.track?.id === track.id;
  const isThisVersionLive = isLive && (!versionId || player.activeVersionId === versionId);
  const isPlaying = isThisVersionLive && player.isPlaying;

  function handleClick() {
    if (isThisVersionLive) player.togglePlay();
    else if (isLive && versionId) player.switchVersion(versionId);
    else player.playTrack(track, versionId);
  }

  const dimensions = size === "sm" ? "h-7 w-7" : "h-9 w-9";
  const iconSize = size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5";
  const base =
    variant === "circle"
      ? `flex ${dimensions} shrink-0 items-center justify-center rounded-full border border-border text-foreground transition hover:border-accent hover:text-accent`
      : "flex shrink-0 items-center justify-center transition";

  return (
    <button
      onClick={handleClick}
      draggable={false}
      aria-label={isPlaying ? "Pause" : "Play"}
      className={`${base} ${className}`}
    >
      {isPlaying ? <PauseIcon className={iconSize} /> : <PlayIcon className={iconSize} />}
    </button>
  );
}

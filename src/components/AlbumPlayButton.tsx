"use client";

import { usePlayer } from "@/components/player/PlayerProvider";
import { PauseIcon, PlayIcon } from "@/components/player/icons";
import type { PlayerTrack } from "@/lib/playerTypes";

/**
 * Plays an album's first track. Styled like a chunky vintage tape-deck
 * transport button (beveled, presses down on click) rather than the plain
 * round PlayTrackButton used elsewhere — this sits on top of a cassette
 * cover, so it leans harder into the physical-device look.
 */
export function AlbumPlayButton({
  track,
  albumId,
  className = "",
}: {
  track: PlayerTrack;
  albumId: string;
  className?: string;
}) {
  const player = usePlayer();
  const isThisAlbumLive = player.track?.albumId === albumId;
  const isPlaying = isThisAlbumLive && player.isPlaying;

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (isThisAlbumLive) player.togglePlay();
    else player.playTrack(track);
  }

  return (
    <button
      onClick={handleClick}
      draggable={false}
      aria-label={isPlaying ? "Pause album" : "Play album"}
      className={`flex h-8 w-8 items-center justify-center rounded-[3px] border border-black/60 bg-gradient-to-b from-[#e8e2d2] to-[#a89f8c] text-[#1c1712] shadow-[0_2px_0_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.7)] transition active:translate-y-px active:shadow-[0_1px_0_rgba(0,0,0,0.55)] ${className}`}
    >
      {isPlaying ? <PauseIcon className="h-3.5 w-3.5" /> : <PlayIcon className="h-3.5 w-3.5" />}
    </button>
  );
}

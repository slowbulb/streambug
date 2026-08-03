"use client";

import { useEffect, useMemo, useRef } from "react";
import { usePlayer } from "@/components/player/PlayerProvider";
import type { PlayerLyricLine } from "@/lib/playerTypes";

export function SyncedLyrics({
  trackId,
  versionId,
  lyrics,
}: {
  trackId: string;
  versionId: string;
  lyrics: PlayerLyricLine[];
}) {
  const { track, activeVersion, currentTime, isPlaying } = usePlayer();
  const isLive = track?.id === trackId && activeVersion?.id === versionId;
  const timeMs = isLive ? currentTime * 1000 : -1;

  const activeIndex = useMemo(() => {
    if (!isLive) return -1;
    let idx = -1;
    for (const line of lyrics) {
      if (line.timeMs <= timeMs) idx += 1;
      else break;
    }
    return idx;
  }, [lyrics, timeMs, isLive]);

  const activeLineRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (isLive && isPlaying) {
      activeLineRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [activeIndex, isLive, isPlaying]);

  if (lyrics.length === 0) {
    return <p className="text-sm text-muted">No synced lyrics yet for this version.</p>;
  }

  return (
    <div className="max-h-96 space-y-3 overflow-y-auto rounded-lg border border-border bg-surface p-4 scroll-smooth">
      {lyrics.map((line, i) => (
        <p
          key={line.id}
          ref={i === activeIndex ? activeLineRef : undefined}
          className={
            i === activeIndex
              ? "text-lg font-semibold text-accent transition-colors"
              : "text-sm text-muted transition-colors"
          }
        >
          {line.text || " "}
        </p>
      ))}
    </div>
  );
}

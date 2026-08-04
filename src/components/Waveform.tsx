"use client";

import { useRef, useState } from "react";

/**
 * SoundCloud-style waveform preview from precomputed amplitude buckets
 * (TrackVersion.waveformPeaks): bars centered vertically, rounded caps,
 * three-tier coloring (played / hovered / unplayed). Purely presentational —
 * no canvas, no audio decoding here. When `onSeek` is given, clicking maps
 * the click position to a 0..1 fraction; `progress` (also 0..1) colors bars
 * up to that point differently so it doubles as a playback position
 * indicator, and hovering previews the seek target the same way SoundCloud's
 * player does.
 */
export function Waveform({
  peaks,
  progress,
  onSeek,
  height = 24,
  className = "",
}: {
  peaks: number[];
  /** 0..1 fraction of playback completed. Omit for a plain, unplayed preview. */
  progress?: number;
  /** Called with a 0..1 fraction when clicked, to seek. Omit for a static, non-interactive waveform. */
  onSeek?: (fraction: number) => void;
  height?: number;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverFraction, setHoverFraction] = useState<number | null>(null);

  if (peaks.length === 0) return null;

  function fractionAt(clientX: number): number {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return 0;
    return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  }

  return (
    <div
      ref={containerRef}
      draggable={false}
      onClick={(e) => onSeek?.(fractionAt(e.clientX))}
      onMouseMove={(e) => onSeek && setHoverFraction(fractionAt(e.clientX))}
      onMouseLeave={() => setHoverFraction(null)}
      className={`flex items-center gap-px ${onSeek ? "cursor-pointer" : ""} ${className}`}
      style={{ height }}
    >
      {peaks.map((p, i) => {
        const at = i / peaks.length;
        const isPlayed = progress !== undefined && at < progress;
        const isHovered = !isPlayed && hoverFraction !== null && at < hoverFraction;
        const color = isPlayed ? "bg-accent" : isHovered ? "bg-accent/40" : "bg-border";
        return (
          <div
            key={i}
            className={`min-h-[3px] flex-1 rounded-full transition-colors ${color}`}
            style={{ height: `${Math.max(12, p * 100)}%` }}
          />
        );
      })}
    </div>
  );
}

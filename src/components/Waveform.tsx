"use client";

/**
 * Static waveform preview from precomputed amplitude buckets
 * (TrackVersion.waveformPeaks). Purely presentational bars — no canvas, no
 * audio decoding here. When `onSeek` is given, clicking anywhere in it maps
 * the click position to a 0..1 fraction; `progress` (also 0..1) colors the
 * bars up to that point differently so it doubles as a playback position
 * indicator.
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
  if (peaks.length === 0) return null;

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!onSeek) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const fraction = rect.width > 0 ? (e.clientX - rect.left) / rect.width : 0;
    onSeek(Math.min(1, Math.max(0, fraction)));
  }

  return (
    <div
      onClick={handleClick}
      className={`flex items-end gap-px ${onSeek ? "cursor-pointer" : ""} ${className}`}
      style={{ height }}
    >
      {peaks.map((p, i) => {
        const played = progress !== undefined && i / peaks.length < progress;
        return (
          <div
            key={i}
            className={`flex-1 rounded-full ${played ? "bg-accent" : "bg-border"}`}
            style={{ height: `${Math.max(10, p * 100)}%` }}
          />
        );
      })}
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { PlayTrackButton } from "@/components/player/PlayTrackButton";
import { usePlayer } from "@/components/player/PlayerProvider";
import { useIsOwner } from "@/components/AuthProvider";
import { LyricsEditor } from "@/components/LyricsEditor";
import { Waveform } from "@/components/Waveform";
import { formatTime } from "@/lib/formatTime";
import { formatLufs, formatVersionLabel } from "@/lib/formatLufs";
import { toPlayerTrack } from "@/lib/toPlayerTrack";
import { VERSION_DRAG_MIME } from "@/lib/dragTypes";
import type { TrackListItem } from "@/lib/queries";

type DragProps = {
  draggable: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragEnd: (e: React.DragEvent) => void;
};

export function TrackRow({
  track,
  showAlbum = true,
  dragProps,
  isDragOver = false,
  dropHint,
}: {
  track: TrackListItem;
  showAlbum?: boolean;
  dragProps?: DragProps;
  isDragOver?: boolean;
  /** Shown in place of the normal row while a drag is hovering over it. */
  dropHint?: string;
}) {
  const isOwner = useIsOwner();
  const [expanded, setExpanded] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const [draggingVersionId, setDraggingVersionId] = useState<string | null>(null);
  const player = usePlayer();
  const playerTrack = toPlayerTrack(track);
  const defaultVersion = track.versions.find((v) => v.isDefault) ?? track.versions[0];
  const hasMultipleVersions = track.versions.length > 1;

  const isLive = player.track?.id === track.id;
  const progress = player.duration > 0 ? player.currentTime / player.duration : 0;

  return (
    <div
      {...(isOwner ? dragProps : undefined)}
      className={`rounded-lg border bg-surface transition-colors ${
        isDragOver ? "border-accent ring-2 ring-accent" : "border-border"
      } ${isOwner && dragProps?.draggable ? "cursor-grab active:cursor-grabbing" : ""}`}
    >
      <div className="flex items-center gap-3 px-3 py-2.5">
        <PlayTrackButton track={playerTrack} />
        <div className="min-w-0 flex-1">
          <Link
            href={`/tracks/${track.id}`}
            draggable={false}
            className="block truncate text-sm font-medium hover:underline"
          >
            {track.title}
          </Link>
          {showAlbum && (
            <p className="truncate text-xs text-muted">{track.album?.title ?? "Single"}</p>
          )}
        </div>
        {isDragOver && dropHint && (
          <span className="shrink-0 text-xs font-medium text-accent">{dropHint}</span>
        )}
        {isLive && player.activeVersion && player.activeVersion.waveformPeaks.length > 0 && (
          <Waveform
            peaks={player.activeVersion.waveformPeaks}
            progress={progress}
            onSeek={(fraction) => player.seek(fraction * player.duration)}
            height={20}
            className="w-40 shrink-0"
          />
        )}
        <button
          onClick={() => setShowLyrics((v) => !v)}
          draggable={false}
          className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[11px] text-muted hover:border-accent hover:text-accent"
        >
          Lyrics {showLyrics ? "▲" : "▼"}
        </button>
        {hasMultipleVersions && (
          <button
            onClick={() => setExpanded((v) => !v)}
            draggable={false}
            className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[11px] text-muted hover:border-accent hover:text-accent"
          >
            {track.versions.length} versions {expanded ? "▲" : "▼"}
          </button>
        )}
        {formatLufs(defaultVersion?.lufs) && (
          <span className="hidden shrink-0 text-xs tabular-nums text-muted sm:inline">
            {formatLufs(defaultVersion?.lufs)}
          </span>
        )}
        <span className="w-10 shrink-0 text-right text-xs tabular-nums text-muted">
          {defaultVersion?.durationSec ? formatTime(defaultVersion.durationSec) : "—"}
        </span>
      </div>

      {showLyrics && !isDragOver && (
        <div className="border-t border-border px-3 py-2.5">
          <LyricsEditor trackId={track.id} initialText={track.lyricsText} />
        </div>
      )}

      {expanded && !isDragOver && (
        <div className="flex flex-col gap-1.5 border-t border-border px-3 py-2.5">
          {track.versions.map((v) => {
            const isThisVersionLive = isLive && player.activeVersionId === v.id;
            return (
              <div
                key={v.id}
                draggable={isOwner}
                onDragStart={
                  isOwner
                    ? (e) => {
                        e.dataTransfer.setData(VERSION_DRAG_MIME, JSON.stringify({ versionId: v.id }));
                        e.dataTransfer.effectAllowed = "move";
                        setDraggingVersionId(v.id);
                      }
                    : undefined
                }
                onDragEnd={() => setDraggingVersionId(null)}
                title={isOwner ? "Drag out to make this its own track" : undefined}
                className={`flex items-center gap-3 ${
                  isOwner ? "cursor-grab active:cursor-grabbing" : ""
                } ${draggingVersionId === v.id ? "opacity-40" : ""}`}
              >
                <PlayTrackButton track={playerTrack} versionId={v.id} size="sm" />
                <span className="min-w-0 max-w-40 shrink truncate text-sm">
                  {formatVersionLabel(v)}
                  {v.isDefault && <span className="ml-1.5 text-xs text-accent">default</span>}
                </span>
                {v.waveformPeaks.length > 0 && (
                  <Waveform
                    peaks={v.waveformPeaks}
                    progress={isThisVersionLive ? progress : undefined}
                    onSeek={
                      isThisVersionLive
                        ? (fraction) => player.seek(fraction * player.duration)
                        : undefined
                    }
                    height={16}
                    className="w-full flex-1"
                  />
                )}
                {formatLufs(v.lufs) && (
                  <span className="shrink-0 text-xs tabular-nums text-muted">{formatLufs(v.lufs)}</span>
                )}
                <span className="w-10 shrink-0 text-right text-xs tabular-nums text-muted">
                  {v.durationSec ? formatTime(v.durationSec) : "—"}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

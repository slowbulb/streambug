"use client";

import { useState } from "react";
import Link from "next/link";
import { PlayTrackButton } from "@/components/player/PlayTrackButton";
import { formatTime } from "@/lib/formatTime";
import { formatLufs, formatVersionLabel } from "@/lib/formatLufs";
import { toPlayerTrack } from "@/lib/toPlayerTrack";
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
  const [expanded, setExpanded] = useState(false);
  const playerTrack = toPlayerTrack(track);
  const defaultVersion = track.versions.find((v) => v.isDefault) ?? track.versions[0];
  const hasMultipleVersions = track.versions.length > 1;

  return (
    <div
      {...dragProps}
      className={`rounded-lg border bg-surface transition-colors ${
        isDragOver ? "border-accent ring-2 ring-accent" : "border-border"
      } ${dragProps?.draggable ? "cursor-grab active:cursor-grabbing" : ""}`}
    >
      <div className="flex items-center gap-3 px-3 py-2.5">
        <PlayTrackButton track={playerTrack} />
        <div className="min-w-0 flex-1">
          <Link
            href={`/tracks/${track.id}`}
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
        {hasMultipleVersions && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[11px] text-muted hover:border-accent hover:text-accent"
          >
            {track.versions.length} versions {expanded ? "▲" : "▼"}
          </button>
        )}
        <span className="w-10 shrink-0 text-right text-xs tabular-nums text-muted">
          {defaultVersion?.durationSec ? formatTime(defaultVersion.durationSec) : "—"}
        </span>
      </div>

      {expanded && !isDragOver && (
        <div className="flex flex-col gap-1.5 border-t border-border px-3 py-2.5">
          {track.versions.map((v) => (
            <div key={v.id} className="flex items-center gap-3">
              <PlayTrackButton track={playerTrack} versionId={v.id} size="sm" />
              <span className="min-w-0 flex-1 truncate text-sm">
                {formatVersionLabel(v)}
                {v.isDefault && <span className="ml-1.5 text-xs text-accent">default</span>}
              </span>
              {formatLufs(v.lufs) && (
                <span className="shrink-0 text-xs tabular-nums text-muted">{formatLufs(v.lufs)}</span>
              )}
              <span className="w-10 shrink-0 text-right text-xs tabular-nums text-muted">
                {v.durationSec ? formatTime(v.durationSec) : "—"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

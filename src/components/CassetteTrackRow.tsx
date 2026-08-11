"use client";

import { useState } from "react";
import Link from "next/link";
import { PlayTrackButton } from "@/components/player/PlayTrackButton";
import { usePlayer } from "@/components/player/PlayerProvider";
import { useIsOwner } from "@/components/AuthProvider";
import { LyricsEditor } from "@/components/LyricsEditor";
import { formatTime } from "@/lib/formatTime";
import { formatVersionLabel } from "@/lib/formatLufs";
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

const INK = "text-[#3a3226]";
const FADED_INK = "text-[#8a7a5c]";
const LEADER = "border-[#8a7a5c]/50";

/**
 * A track row styled after a cassette J-card's printed tracklist: numbered,
 * monospace, dotted leader between title and running time. Used only on the
 * album page (ReorderableTrackList) — same merge-onto-row / drag-to-reorder-
 * in-gap / drag-version-out-to-split gestures as the plain TrackRow, just a
 * different skin, so it's a separate component rather than a TrackRow prop.
 */
export function CassetteTrackRow({
  track,
  index,
  dragProps,
  isDragOver = false,
  dropHint,
}: {
  track: TrackListItem;
  index: number;
  dragProps?: DragProps;
  isDragOver?: boolean;
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

  return (
    <div
      {...(isOwner ? dragProps : undefined)}
      className={isOwner && dragProps?.draggable ? "cursor-grab active:cursor-grabbing" : ""}
    >
      <div
        className={`flex items-baseline gap-2 border-b py-1.5 transition-colors ${
          isDragOver ? `${LEADER} bg-[#b3312c]/10` : "border-[#8a7a5c]/25"
        }`}
      >
        <PlayTrackButton
          track={playerTrack}
          variant="bare"
          className={`${isLive ? "text-[#b3312c]" : INK} h-4 w-4`}
        />
        <span className={`w-5 shrink-0 tabular-nums ${FADED_INK}`}>
          {String(index + 1).padStart(2, "0")}
        </span>

        {isDragOver && dropHint ? (
          <span className="text-[#b3312c]">{dropHint}</span>
        ) : (
          <>
            <Link
              href={`/tracks/${track.id}`}
              draggable={false}
              className={`shrink-0 truncate font-medium hover:underline ${isLive ? "text-[#b3312c]" : INK}`}
              style={{ maxWidth: "60%" }}
            >
              {track.title}
            </Link>
            <button
              onClick={() => setShowLyrics((v) => !v)}
              draggable={false}
              className={`shrink-0 ${FADED_INK} hover:text-[#b3312c]`}
            >
              [lyrics]
            </button>
            {hasMultipleVersions && (
              <button
                onClick={() => setExpanded((v) => !v)}
                draggable={false}
                className={`shrink-0 ${FADED_INK} hover:text-[#b3312c]`}
              >
                [{track.versions.length}]
              </button>
            )}
            <span className={`mx-1 h-0 flex-1 translate-y-[-3px] border-b border-dotted ${LEADER}`} />
            <span className={`shrink-0 tabular-nums ${FADED_INK}`}>
              {defaultVersion?.durationSec ? formatTime(defaultVersion.durationSec) : "--:--"}
            </span>
          </>
        )}
      </div>

      {showLyrics && !isDragOver && (
        <div className="border-b border-[#8a7a5c]/25 py-1.5 pl-9">
          <LyricsEditor trackId={track.id} initialText={track.lyricsText} />
        </div>
      )}

      {expanded && !isDragOver && (
        <div className="flex flex-col gap-1 border-b border-[#8a7a5c]/25 py-1.5 pl-9">
          {track.versions.map((v, i) => {
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
                className={`flex items-baseline gap-2 text-[12px] ${
                  isOwner ? "cursor-grab active:cursor-grabbing" : ""
                } ${draggingVersionId === v.id ? "opacity-40" : ""}`}
              >
                <PlayTrackButton
                  track={playerTrack}
                  versionId={v.id}
                  variant="bare"
                  className={`${isThisVersionLive ? "text-[#b3312c]" : INK} h-3 w-3`}
                />
                <span className={`w-4 shrink-0 ${FADED_INK}`}>
                  {String.fromCharCode(97 + i)})
                </span>
                <span className={`shrink-0 truncate ${isThisVersionLive ? "text-[#b3312c]" : INK}`}>
                  {formatVersionLabel(v)}
                </span>
                <span className={`mx-1 h-0 flex-1 translate-y-[-3px] border-b border-dotted ${LEADER}`} />
                <span className={`shrink-0 tabular-nums ${FADED_INK}`}>
                  {v.durationSec ? formatTime(v.durationSec) : "--:--"}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { mergeTrackIntoVersionAction, moveTrackAction } from "@/app/actions";
import { CassetteTrackRow } from "@/components/CassetteTrackRow";
import type { TrackListItem } from "@/lib/queries";

/**
 * Drag a track directly onto another to merge it in as a new version of
 * that track. Drag it into the gap between two tracks (or before the first
 * / after the last) to reorder instead — the gap only appears as a distinct
 * drop target while a drag is in progress. Styled like the back of a
 * cassette J-card's printed tracklist (CassetteTrackRow) — a deliberately
 * different skin from the rest of the app, scoped to this component.
 */
export function ReorderableTrackList({
  albumId,
  albumTitle,
  albumArtist,
  tracks,
}: {
  albumId: string;
  albumTitle: string;
  albumArtist?: string | null;
  tracks: TrackListItem[];
}) {
  const [order, setOrder] = useState(tracks);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overTrackId, setOverTrackId] = useState<string | null>(null);
  const [overGapId, setOverGapId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function handleMerge(targetId: string) {
    if (dragId && dragId !== targetId) {
      const sourceId = dragId;
      setOrder((current) => current.filter((t) => t.id !== sourceId));
      startTransition(() => {
        mergeTrackIntoVersionAction(sourceId, targetId);
      });
    }
    setDragId(null);
    setOverTrackId(null);
  }

  function handleReorder(beforeTrackId: string | undefined) {
    const trackId = dragId;
    if (!trackId) return;

    setOrder((current) => {
      const fromIndex = current.findIndex((t) => t.id === trackId);
      const toIndex = beforeTrackId
        ? current.findIndex((t) => t.id === beforeTrackId)
        : current.length;
      if (fromIndex === -1 || toIndex === fromIndex || toIndex === fromIndex + 1) {
        return current;
      }

      const next = current.slice();
      const [moved] = next.splice(fromIndex, 1);
      const insertAt = beforeTrackId ? next.findIndex((t) => t.id === beforeTrackId) : next.length;
      next.splice(insertAt === -1 ? next.length : insertAt, 0, moved);

      startTransition(() => {
        moveTrackAction(trackId, albumId, beforeTrackId);
      });
      return next;
    });

    setDragId(null);
    setOverGapId(null);
  }

  return (
    <div
      className="rounded-sm border border-[#c9bb95] bg-[#f4ecd8] p-4 shadow-[0_2px_14px_rgba(0,0,0,0.18)] font-[family-name:var(--font-geist-mono)] text-[13px] text-[#3a3226]"
    >
      <div className="mb-2 flex items-baseline justify-between border-b-2 border-[#3a3226] pb-1.5">
        <span className="truncate font-bold uppercase tracking-wide">
          {albumArtist ? `${albumArtist} — ` : ""}
          {albumTitle}
        </span>
        <span className="shrink-0 pl-3 text-[11px] font-bold uppercase tracking-widest text-[#b3312c]">
          Side A
        </span>
      </div>

      <Gap
        id="start"
        isOver={overGapId === "start"}
        isDragging={dragId !== null}
        onDragOver={() => setOverGapId("start")}
        onDragLeave={() => setOverGapId((id) => (id === "start" ? null : id))}
        onDrop={() => handleReorder(order[0]?.id)}
      />
      {order.map((track, i) => (
        <div key={track.id}>
          <CassetteTrackRow
            track={track}
            index={i}
            isDragOver={overTrackId === track.id}
            dropHint="drop to add as a version"
            dragProps={{
              draggable: true,
              onDragStart: (e) => {
                setDragId(track.id);
                e.dataTransfer.effectAllowed = "move";
              },
              onDragOver: (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                if (dragId && dragId !== track.id) {
                  setOverTrackId(track.id);
                  setOverGapId(null);
                }
              },
              onDragLeave: () => setOverTrackId((id) => (id === track.id ? null : id)),
              onDrop: (e) => {
                e.preventDefault();
                handleMerge(track.id);
              },
              onDragEnd: () => {
                setDragId(null);
                setOverTrackId(null);
                setOverGapId(null);
              },
            }}
          />
          <Gap
            id={track.id}
            isOver={overGapId === track.id}
            isDragging={dragId !== null}
            onDragOver={() => {
              setOverGapId(track.id);
              setOverTrackId(null);
            }}
            onDragLeave={() => setOverGapId((id) => (id === track.id ? null : id))}
            onDrop={() => handleReorder(order[i + 1]?.id)}
          />
        </div>
      ))}

      <p className="mt-3 border-t border-[#8a7a5c]/25 pt-2 text-[10px] uppercase tracking-widest text-[#8a7a5c]">
        {order.length} track{order.length === 1 ? "" : "s"} · total{" "}
        {formatTotalTime(order)}
      </p>
    </div>
  );
}

function formatTotalTime(tracks: TrackListItem[]): string {
  const totalSec = tracks.reduce((sum, t) => {
    const v = t.versions.find((v) => v.isDefault) ?? t.versions[0];
    return sum + (v?.durationSec ?? 0);
  }, 0);
  const min = Math.floor(totalSec / 60);
  const sec = Math.round(totalSec % 60);
  return `${min}:${String(sec).padStart(2, "0")}`;
}

/** Drop zone between (or before/after) track rows, dedicated to reordering. */
function Gap({
  isOver,
  isDragging,
  onDragOver,
  onDragLeave,
  onDrop,
}: {
  id: string;
  isOver: boolean;
  isDragging: boolean;
  onDragOver: () => void;
  onDragLeave: () => void;
  onDrop: () => void;
}) {
  if (!isDragging) return null;

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        onDragOver();
      }}
      onDragLeave={onDragLeave}
      onDrop={(e) => {
        e.preventDefault();
        onDrop();
      }}
      className="flex items-center justify-center"
      style={{ height: isOver ? 22 : 8 }}
    >
      <span
        className={`w-full text-center text-[10px] uppercase tracking-widest transition-colors ${
          isOver ? "text-[#b3312c]" : "text-transparent"
        }`}
      >
        {isOver ? "· · · drop to reorder · · ·" : "·"}
      </span>
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { mergeTrackIntoVersionAction, moveTrackAction } from "@/app/actions";
import { TrackRow } from "@/components/TrackRow";
import type { TrackListItem } from "@/lib/queries";

/**
 * Drag a track directly onto another to merge it in as a new version of
 * that track. Drag it into the gap between two tracks (or before the first
 * / after the last) to reorder instead — the gap only appears as a distinct
 * drop target while a drag is in progress.
 */
export function ReorderableTrackList({
  albumId,
  tracks,
}: {
  albumId: string;
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
    <div className="flex flex-col">
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
          <TrackRow
            track={track}
            showAlbum={false}
            isDragOver={overTrackId === track.id}
            dropHint="Drop to add as a version"
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
    </div>
  );
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
  if (!isDragging) return <div className="h-2" />;

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
      className="flex items-center justify-center py-1"
    >
      {isOver ? (
        <span className="w-full rounded border border-dashed border-accent bg-accent/10 py-1 text-center text-[11px] font-medium text-accent">
          Drop to reorder here
        </span>
      ) : (
        <div className="h-1 w-full" />
      )}
    </div>
  );
}

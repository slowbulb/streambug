"use client";

import { useState, useTransition } from "react";
import { reorderTracksAction } from "@/app/actions";
import { TrackRow } from "@/components/TrackRow";
import type { TrackListItem } from "@/lib/queries";

/** Drag tracks up/down within an album to resequence them. */
export function ReorderableTrackList({
  albumId,
  tracks,
}: {
  albumId: string;
  tracks: TrackListItem[];
}) {
  const [order, setOrder] = useState(tracks);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function handleDrop(targetId: string) {
    setOrder((current) => {
      if (!dragId || dragId === targetId) return current;
      const fromIndex = current.findIndex((t) => t.id === dragId);
      const toIndex = current.findIndex((t) => t.id === targetId);
      if (fromIndex === -1 || toIndex === -1) return current;

      const next = current.slice();
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);

      startTransition(() => {
        reorderTracksAction(albumId, next.map((t) => t.id));
      });
      return next;
    });
    setDragId(null);
    setOverId(null);
  }

  return (
    <div className="flex flex-col gap-2">
      {order.map((track) => (
        <TrackRow
          key={track.id}
          track={track}
          showAlbum={false}
          isDragOver={overId === track.id}
          dropHint="Drop to reorder"
          dragProps={{
            draggable: true,
            onDragStart: (e) => {
              setDragId(track.id);
              e.dataTransfer.effectAllowed = "move";
            },
            onDragOver: (e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              if (dragId && dragId !== track.id) setOverId(track.id);
            },
            onDragLeave: () => setOverId((id) => (id === track.id ? null : id)),
            onDrop: (e) => {
              e.preventDefault();
              handleDrop(track.id);
            },
            onDragEnd: () => {
              setDragId(null);
              setOverId(null);
            },
          }}
        />
      ))}
    </div>
  );
}

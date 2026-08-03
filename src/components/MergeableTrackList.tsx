"use client";

import { useState, useTransition } from "react";
import { mergeTrackIntoVersionAction } from "@/app/actions";
import { TrackRow } from "@/components/TrackRow";
import type { TrackListItem } from "@/lib/queries";

/** Drag one track onto another to fold it in as a new version of that track. */
export function MergeableTrackList({ tracks }: { tracks: TrackListItem[] }) {
  const [list, setList] = useState(tracks);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function handleDrop(targetId: string) {
    if (dragId && dragId !== targetId) {
      const sourceId = dragId;
      setList((current) => current.filter((t) => t.id !== sourceId));
      startTransition(() => {
        mergeTrackIntoVersionAction(sourceId, targetId);
      });
    }
    setDragId(null);
    setOverId(null);
  }

  return (
    <div className="flex flex-col gap-2">
      {list.map((track) => (
        <TrackRow
          key={track.id}
          track={track}
          isDragOver={overId === track.id}
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

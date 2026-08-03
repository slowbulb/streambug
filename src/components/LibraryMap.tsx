"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { moveTrackAction } from "@/app/actions";
import { formatTime } from "@/lib/formatTime";
import type { LibraryMapAlbum, LibraryMapTrack } from "@/lib/queries";

export function LibraryMap({
  albums,
  tracks: initialTracks,
}: {
  albums: LibraryMapAlbum[];
  tracks: LibraryMapTrack[];
}) {
  const [tracks, setTracks] = useState(initialTracks);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overKey, setOverKey] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function move(targetAlbumId: string | null, beforeTrackId?: string) {
    const sourceId = dragId;
    if (!sourceId) return;
    if (sourceId === beforeTrackId) {
      setDragId(null);
      setOverKey(null);
      return;
    }

    setTracks((current) => {
      const dragged = current.find((t) => t.id === sourceId);
      if (!dragged) return current;

      const rest = current.filter((t) => t.id !== sourceId);
      const siblingIds = rest
        .filter((t) => t.albumId === targetAlbumId)
        .sort((a, b) => a.position - b.position)
        .map((t) => t.id);
      const insertIndex = beforeTrackId ? siblingIds.indexOf(beforeTrackId) : -1;
      siblingIds.splice(insertIndex === -1 ? siblingIds.length : insertIndex, 0, sourceId);
      const positionOf = new Map(siblingIds.map((id, i) => [id, i]));

      return [
        ...rest.map((t) =>
          positionOf.has(t.id)
            ? { ...t, albumId: targetAlbumId, position: positionOf.get(t.id)! }
            : t,
        ),
        { ...dragged, albumId: targetAlbumId, position: positionOf.get(sourceId)! },
      ];
    });

    startTransition(() => {
      moveTrackAction(sourceId, targetAlbumId, beforeTrackId);
    });
    setDragId(null);
    setOverKey(null);
  }

  const singles = tracks
    .filter((t) => !t.albumId)
    .sort((a, b) => a.position - b.position);

  return (
    <div className="columns-1 gap-6 lg:columns-2 xl:columns-3">
      {albums.map((album) => (
        <Cluster
          key={album.id}
          title={album.title}
          coverUrl={album.coverUrl}
          tracks={tracks.filter((t) => t.albumId === album.id).sort((a, b) => a.position - b.position)}
          dragId={dragId}
          overKey={overKey}
          nodeKey={album.id}
          onDragStartTrack={setDragId}
          onDragOverKey={setOverKey}
          onDropOnCluster={() => move(album.id)}
          onDropOnTrack={(trackId) => move(album.id, trackId)}
        />
      ))}
      <Cluster
        title="Singles"
        dashed
        tracks={singles}
        dragId={dragId}
        overKey={overKey}
        nodeKey="singles"
        onDragStartTrack={setDragId}
        onDragOverKey={setOverKey}
        onDropOnCluster={() => move(null)}
        onDropOnTrack={(trackId) => move(null, trackId)}
      />
    </div>
  );
}

function Cluster({
  title,
  coverUrl,
  dashed = false,
  tracks,
  dragId,
  overKey,
  nodeKey,
  onDragStartTrack,
  onDragOverKey,
  onDropOnCluster,
  onDropOnTrack,
}: {
  title: string;
  coverUrl?: string | null;
  dashed?: boolean;
  tracks: LibraryMapTrack[];
  dragId: string | null;
  overKey: string | null;
  nodeKey: string;
  onDragStartTrack: (id: string) => void;
  onDragOverKey: React.Dispatch<React.SetStateAction<string | null>>;
  onDropOnCluster: () => void;
  onDropOnTrack: (trackId: string) => void;
}) {
  const headerKey = `header:${nodeKey}`;

  return (
    <div className="mb-6 break-inside-avoid">
      <div
        onDragOver={(e) => {
          if (!dragId) return;
          e.preventDefault();
          onDragOverKey(headerKey);
        }}
        onDragLeave={() => onDragOverKey((k) => (k === headerKey ? null : k))}
        onDrop={(e) => {
          e.preventDefault();
          onDropOnCluster();
        }}
        className={`flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors ${
          overKey === headerKey
            ? "border-accent bg-accent/10"
            : dashed
              ? "border-dashed border-border bg-surface"
              : "border-border bg-surface"
        }`}
      >
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverUrl} alt="" className="h-8 w-8 shrink-0 rounded object-cover" />
        ) : (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-background text-sm">
            {dashed ? "•" : "🎵"}
          </span>
        )}
        <span className="truncate text-sm font-semibold">{title}</span>
        <span className="ml-auto shrink-0 text-xs text-muted">{tracks.length}</span>
      </div>

      {tracks.length > 0 && (
        <div className="ml-4 mt-1 border-l-2 border-border pl-4">
          {tracks.map((track, i) => {
            const isDragOver = overKey === track.id;
            return (
              <div key={track.id} className="relative py-1">
                <span className="absolute -left-4 top-1/2 h-px w-4 bg-border" />
                <div
                  draggable
                  onDragStart={(e) => {
                    onDragStartTrack(track.id);
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  onDragOver={(e) => {
                    if (!dragId || dragId === track.id) return;
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    onDragOverKey(track.id);
                  }}
                  onDragLeave={() => onDragOverKey((k) => (k === track.id ? null : k))}
                  onDrop={(e) => {
                    e.preventDefault();
                    onDropOnTrack(track.id);
                  }}
                  onDragEnd={() => onDragOverKey(null)}
                  className={`flex cursor-grab items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm transition-colors active:cursor-grabbing ${
                    isDragOver ? "border-accent bg-accent/10" : "border-border bg-surface"
                  }`}
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-background text-[11px] tabular-nums text-muted">
                    {i + 1}
                  </span>
                  <Link href={`/tracks/${track.id}`} className="min-w-0 flex-1 truncate hover:underline">
                    {track.title}
                  </Link>
                  {track.versionCount > 1 && (
                    <span className="shrink-0 text-[11px] text-muted">{track.versionCount}v</span>
                  )}
                  <span className="w-9 shrink-0 text-right text-[11px] tabular-nums text-muted">
                    {track.durationSec ? formatTime(track.durationSec) : "—"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

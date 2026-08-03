import Link from "next/link";
import { PlayTrackButton } from "@/components/player/PlayTrackButton";
import { formatTime } from "@/lib/formatTime";
import { toPlayerTrack } from "@/lib/queries";
import type { getRecentTracks } from "@/lib/queries";

type Track = Awaited<ReturnType<typeof getRecentTracks>>[number];

export function TrackRow({ track, showAlbum = true }: { track: Track; showAlbum?: boolean }) {
  const defaultVersion = track.versions.find((v) => v.isDefault) ?? track.versions[0];

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2.5">
      <PlayTrackButton track={toPlayerTrack(track)} />
      <div className="min-w-0 flex-1">
        <Link href={`/tracks/${track.id}`} className="block truncate text-sm font-medium hover:underline">
          {track.title}
        </Link>
        {showAlbum && (
          <p className="truncate text-xs text-muted">{track.album?.title ?? "Single"}</p>
        )}
      </div>
      {track.versions.length > 1 && (
        <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[11px] text-muted">
          {track.versions.length} versions
        </span>
      )}
      <span className="w-10 shrink-0 text-right text-xs tabular-nums text-muted">
        {defaultVersion?.durationSec ? formatTime(defaultVersion.durationSec) : "—"}
      </span>
    </div>
  );
}

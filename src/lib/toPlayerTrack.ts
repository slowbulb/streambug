import type { PlayerTrack } from "@/lib/playerTypes";
import type { getTrackForPlayer } from "@/lib/queries";

type TrackForPlayer = NonNullable<Awaited<ReturnType<typeof getTrackForPlayer>>>;

// Pure data-shaping only (no Prisma import) so it's safe to use from client
// components (e.g. TrackRow) as well as server code.
export function toPlayerTrack(track: TrackForPlayer): PlayerTrack {
  return {
    id: track.id,
    title: track.title,
    albumId: track.albumId,
    albumTitle: track.album?.title ?? null,
    albumArtist: track.album?.artist ?? null,
    versions: track.versions.map((v) => ({
      id: v.id,
      versionNumber: v.versionNumber,
      label: v.label,
      originalFilename: v.originalFilename,
      audioUrl: v.audioUrl,
      durationSec: v.durationSec,
      lufs: v.lufs,
      waveformPeaks: v.waveformPeaks,
      isDefault: v.isDefault,
      lyrics: v.lyrics.map((l) => ({ id: l.id, timeMs: l.timeMs, text: l.text })),
    })),
  };
}

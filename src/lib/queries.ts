import { prisma } from "@/lib/db";

export { toPlayerTrack } from "@/lib/toPlayerTrack";

const trackInclude = {
  album: true,
  versions: {
    orderBy: { versionNumber: "asc" as const },
    include: {
      lyrics: { orderBy: [{ timeMs: "asc" as const }, { order: "asc" as const }] },
    },
  },
};

export async function getTrackForPlayer(trackId: string) {
  return prisma.track.findUnique({ where: { id: trackId }, include: trackInclude });
}

export async function getRecentTracks(limit: number) {
  return prisma.track.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: trackInclude,
  });
}

export async function getAllTracks() {
  return prisma.track.findMany({
    orderBy: { createdAt: "desc" },
    include: trackInclude,
  });
}

export async function getAlbumWithTracks(albumId: string) {
  const album = await prisma.album.findUnique({ where: { id: albumId } });
  if (!album) return null;
  const tracks = await prisma.track.findMany({
    where: { albumId },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    include: trackInclude,
  });
  return { album, tracks };
}

// Albums include their first track (by position) so the rack can offer a
// "play album" button without a second round-trip per album.
const albumInclude = {
  _count: { select: { tracks: true } },
  tracks: {
    orderBy: [{ position: "asc" as const }, { createdAt: "asc" as const }],
    take: 1,
    include: trackInclude,
  },
};

export async function getRecentAlbums(limit: number) {
  return prisma.album.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: albumInclude,
  });
}

export async function getAllAlbums() {
  return prisma.album.findMany({
    orderBy: { createdAt: "desc" },
    include: albumInclude,
  });
}

export type AlbumListItem = Awaited<ReturnType<typeof getAllAlbums>>[number];
export type TrackListItem = Awaited<ReturnType<typeof getRecentTracks>>[number];

// Lean shape for the /map page — just enough to lay out and reorganize the
// library, not the full lyrics/version detail the player views need.
export async function getLibraryMap() {
  const [albums, tracks] = await Promise.all([
    prisma.album.findMany({
      orderBy: { createdAt: "asc" },
      select: { id: true, title: true, artist: true, coverUrl: true },
    }),
    prisma.track.findMany({
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        title: true,
        albumId: true,
        position: true,
        versions: { select: { durationSec: true, isDefault: true } },
      },
    }),
  ]);

  return {
    albums,
    tracks: tracks.map((t) => ({
      id: t.id,
      title: t.title,
      albumId: t.albumId,
      position: t.position,
      durationSec: (t.versions.find((v) => v.isDefault) ?? t.versions[0])?.durationSec ?? null,
      versionCount: t.versions.length,
    })),
  };
}

export type LibraryMapAlbum = Awaited<ReturnType<typeof getLibraryMap>>["albums"][number];
export type LibraryMapTrack = Awaited<ReturnType<typeof getLibraryMap>>["tracks"][number];

// Versions uploaded before the waveform feature existed have no peaks yet —
// used to power a one-off "backfill" action that fetches and analyzes them.
export async function getVersionsMissingWaveform() {
  return prisma.trackVersion.findMany({
    where: { waveformPeaks: { isEmpty: true } },
    select: { id: true, audioUrl: true, track: { select: { title: true } } },
    orderBy: { createdAt: "asc" },
  });
}

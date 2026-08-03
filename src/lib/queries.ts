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

export async function getRecentAlbums(limit: number) {
  return prisma.album.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { _count: { select: { tracks: true } } },
  });
}

export async function getAllAlbums() {
  return prisma.album.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { tracks: true } } },
  });
}

export type TrackListItem = Awaited<ReturnType<typeof getRecentTracks>>[number];

import { prisma } from "@/lib/db";
import type { PlayerTrack } from "@/lib/playerTypes";

const trackInclude = {
  album: true,
  versions: {
    orderBy: { createdAt: "asc" as const },
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
    orderBy: { createdAt: "asc" },
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

type TrackForPlayer = NonNullable<Awaited<ReturnType<typeof getTrackForPlayer>>>;

export function toPlayerTrack(track: TrackForPlayer): PlayerTrack {
  return {
    id: track.id,
    title: track.title,
    albumId: track.albumId,
    albumTitle: track.album?.title ?? null,
    versions: track.versions.map((v) => ({
      id: v.id,
      label: v.label,
      audioUrl: v.audioUrl,
      durationSec: v.durationSec,
      isDefault: v.isDefault,
      lyrics: v.lyrics.map((l) => ({ id: l.id, timeMs: l.timeMs, text: l.text })),
    })),
  };
}

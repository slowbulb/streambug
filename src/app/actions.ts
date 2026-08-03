"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { deleteUploadedFile, saveUploadedFile } from "@/lib/storage";
import { probeDurationSec } from "@/lib/audioMeta";
import { parseLrc } from "@/lib/lrc";

function str(formData: FormData, key: string): string | null {
  const v = formData.get(key);
  if (typeof v !== "string" || v.trim() === "") return null;
  return v.trim();
}

function file(formData: FormData, key: string): File | null {
  const v = formData.get(key);
  if (!(v instanceof File) || v.size === 0) return null;
  return v;
}

function assertAudio(f: File) {
  if (f.type && !f.type.startsWith("audio/")) {
    throw new Error(`"${f.name}" doesn't look like an audio file (${f.type}).`);
  }
}

type ResolvedAudio = {
  url: string;
  key: string;
  mimeType: string;
  fileSize: number;
  durationSec?: number;
};

/**
 * Audio may already be uploaded (direct-to-Blob from the browser, carrying
 * audioUrl/audioKey/etc as plain fields) or arrive as a raw File in FormData
 * (the local-disk dev fallback, which never leaves the server).
 */
async function resolveUploadedAudio(formData: FormData): Promise<ResolvedAudio> {
  const preUploadedUrl = str(formData, "audioUrl");
  if (preUploadedUrl) {
    const key = str(formData, "audioKey");
    if (!key) throw new Error("Missing upload key");
    const durationSec = str(formData, "durationSec");
    return {
      url: preUploadedUrl,
      key,
      mimeType: str(formData, "mimeType") ?? "application/octet-stream",
      fileSize: Number(str(formData, "fileSize") ?? "0"),
      durationSec: durationSec ? Number(durationSec) : undefined,
    };
  }

  const audio = file(formData, "audio");
  if (!audio) throw new Error("An audio file is required");
  assertAudio(audio);

  const [{ url, key }, durationSec] = await Promise.all([
    saveUploadedFile(audio, "audio"),
    probeDurationSec(audio),
  ]);
  return { url, key, mimeType: audio.type || "application/octet-stream", fileSize: audio.size, durationSec };
}

/** Same idea as resolveUploadedAudio, for the optional album cover image. */
async function resolveUploadedCover(
  formData: FormData,
): Promise<{ url: string; key: string } | null> {
  const preUploadedUrl = str(formData, "coverUrl");
  if (preUploadedUrl) {
    const key = str(formData, "coverKey");
    if (!key) throw new Error("Missing upload key");
    return { url: preUploadedUrl, key };
  }

  const cover = file(formData, "cover");
  if (!cover) return null;
  return saveUploadedFile(cover, "covers");
}

/** Create an album, optionally with a cover image. */
export async function createAlbumAction(formData: FormData) {
  const title = str(formData, "title");
  if (!title) throw new Error("Album title is required");
  const description = str(formData, "description");

  const stored = await resolveUploadedCover(formData);

  const album = await prisma.album.create({
    data: {
      title,
      description,
      coverUrl: stored?.url ?? null,
      coverKey: stored?.key ?? null,
    },
  });

  revalidatePath("/albums");
  revalidatePath("/");
  redirect(`/albums/${album.id}`);
}

/** Edit an album's title/description, optionally replacing its cover. */
export async function updateAlbumAction(albumId: string, formData: FormData) {
  const title = str(formData, "title");
  if (!title) throw new Error("Album title is required");
  const description = str(formData, "description");

  const data: {
    title: string;
    description: string | null;
    coverUrl?: string;
    coverKey?: string;
  } = { title, description };

  const stored = await resolveUploadedCover(formData);
  if (stored) {
    const existing = await prisma.album.findUniqueOrThrow({ where: { id: albumId } });
    data.coverUrl = stored.url;
    data.coverKey = stored.key;
    if (existing.coverKey) await deleteUploadedFile(existing.coverKey);
  }

  await prisma.album.update({ where: { id: albumId }, data });

  revalidatePath("/albums");
  revalidatePath(`/albums/${albumId}`);
  redirect(`/albums/${albumId}`);
}

/** Delete an album. Its tracks are kept and simply detached (moved to "no album"). */
export async function deleteAlbumAction(albumId: string) {
  const album = await prisma.album.findUniqueOrThrow({ where: { id: albumId } });

  await prisma.album.delete({ where: { id: albumId } });

  if (album.coverKey) await deleteUploadedFile(album.coverKey);

  revalidatePath("/albums");
  revalidatePath("/");
  redirect("/albums");
}

/** Create a new track with its first version (audio file required). */
export async function createTrackAction(formData: FormData) {
  const title = str(formData, "title");
  if (!title) throw new Error("Track title is required");
  const albumId = str(formData, "albumId");
  const label = str(formData, "label") ?? "Original";

  const { url, key, mimeType, fileSize, durationSec } = await resolveUploadedAudio(formData);

  const track = await prisma.track.create({
    data: {
      title,
      albumId,
      versions: {
        create: {
          label,
          isDefault: true,
          audioUrl: url,
          storageKey: key,
          mimeType,
          fileSize,
          durationSec,
        },
      },
    },
  });

  revalidatePath("/");
  revalidatePath("/albums");
  if (albumId) revalidatePath(`/albums/${albumId}`);
  redirect(`/tracks/${track.id}`);
}

/** Edit a track's title, or move it to a different album. */
export async function updateTrackAction(trackId: string, formData: FormData) {
  const title = str(formData, "title");
  if (!title) throw new Error("Track title is required");
  const albumId = str(formData, "albumId");

  const before = await prisma.track.findUniqueOrThrow({ where: { id: trackId } });
  await prisma.track.update({ where: { id: trackId }, data: { title, albumId } });

  revalidatePath(`/tracks/${trackId}`);
  if (before.albumId) revalidatePath(`/albums/${before.albumId}`);
  if (albumId) revalidatePath(`/albums/${albumId}`);
  redirect(`/tracks/${trackId}`);
}

/** Add another version (e.g. a remix or live take) of an existing track. */
export async function addVersionAction(trackId: string, formData: FormData) {
  const label = str(formData, "label");
  if (!label) throw new Error("A label for this version is required");

  const [{ url, key, mimeType, fileSize, durationSec }, existingCount] = await Promise.all([
    resolveUploadedAudio(formData),
    prisma.trackVersion.count({ where: { trackId } }),
  ]);

  await prisma.trackVersion.create({
    data: {
      trackId,
      label,
      isDefault: existingCount === 0,
      audioUrl: url,
      storageKey: key,
      mimeType,
      fileSize,
      durationSec,
    },
  });

  revalidatePath(`/tracks/${trackId}`);
}

/** Make a version the one that plays by default when the track is opened. */
export async function setDefaultVersionAction(trackId: string, versionId: string) {
  await prisma.$transaction([
    prisma.trackVersion.updateMany({ where: { trackId }, data: { isDefault: false } }),
    prisma.trackVersion.update({ where: { id: versionId }, data: { isDefault: true } }),
  ]);

  revalidatePath(`/tracks/${trackId}`);
}

/** Delete a single version. A track always needs at least one version left. */
export async function deleteVersionAction(trackId: string, versionId: string) {
  const versions = await prisma.trackVersion.findMany({
    where: { trackId },
    orderBy: { createdAt: "asc" },
  });
  if (versions.length <= 1) {
    throw new Error("Can't delete the only version of a track — delete the track instead.");
  }

  const target = versions.find((v) => v.id === versionId);
  if (!target) throw new Error("Version not found");

  await prisma.trackVersion.delete({ where: { id: versionId } });
  await deleteUploadedFile(target.storageKey);

  if (target.isDefault) {
    const nextDefault = versions.find((v) => v.id !== versionId);
    if (nextDefault) {
      await prisma.trackVersion.update({
        where: { id: nextDefault.id },
        data: { isDefault: true },
      });
    }
  }

  revalidatePath(`/tracks/${trackId}`);
}

/** Delete a track entirely, along with all of its versions and lyrics. */
export async function deleteTrackAction(trackId: string) {
  const track = await prisma.track.findUniqueOrThrow({
    where: { id: trackId },
    include: { versions: true },
  });

  await prisma.track.delete({ where: { id: trackId } });
  await Promise.all(track.versions.map((v) => deleteUploadedFile(v.storageKey)));

  revalidatePath("/");
  revalidatePath("/albums");
  if (track.albumId) revalidatePath(`/albums/${track.albumId}`);
  redirect(track.albumId ? `/albums/${track.albumId}` : "/albums");
}

/** Replace a version's synced lyrics from pasted LRC-format text. */
export async function saveLyricsAction(trackId: string, versionId: string, formData: FormData) {
  const lrcText = str(formData, "lrcText") ?? "";
  const lines = parseLrc(lrcText);
  if (lines.length === 0) {
    throw new Error(
      "No synced lines found — paste LRC-format lyrics, e.g. [00:12.34] first line",
    );
  }

  await prisma.$transaction([
    prisma.lyricLine.deleteMany({ where: { trackVersionId: versionId } }),
    prisma.lyricLine.createMany({
      data: lines.map((l) => ({ ...l, trackVersionId: versionId })),
    }),
  ]);

  revalidatePath(`/tracks/${trackId}`);
}

/** Clear a version's synced lyrics. */
export async function clearLyricsAction(trackId: string, versionId: string) {
  await prisma.lyricLine.deleteMany({ where: { trackVersionId: versionId } });
  revalidatePath(`/tracks/${trackId}`);
}

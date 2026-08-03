"use client";

import { upload } from "@vercel/blob/client";
import lufs from "@audio/loudness-lufs";

export async function uploadFileDirect(
  file: File,
  folder: "audio" | "covers",
): Promise<{ url: string; key: string }> {
  const blob = await upload(`${folder}/${crypto.randomUUID()}-${file.name}`, file, {
    access: "public",
    handleUploadUrl: "/api/upload",
  });
  return { url: blob.url, key: blob.pathname };
}

// Best-effort client-side duration probe (used for the direct-to-Blob path,
// where the server never sees the raw file to inspect it).
export function probeDurationClient(file: File): Promise<number | undefined> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    const cleanup = () => URL.revokeObjectURL(url);
    audio.addEventListener("loadedmetadata", () => {
      cleanup();
      resolve(Number.isFinite(audio.duration) ? audio.duration : undefined);
    });
    audio.addEventListener("error", () => {
      cleanup();
      resolve(undefined);
    });
    audio.src = url;
  });
}

// Integrated loudness (LUFS, ITU-R BS.1770-4), measured client-side by fully
// decoding the file with the Web Audio API and running a pure-JS gated
// K-weighted measurement over the decoded samples. There's no server-side
// equivalent that doesn't require shelling out to ffmpeg, so this always
// runs client-side regardless of which upload path (Blob vs local-disk) is
// used. Best-effort: returns undefined for formats the browser can't decode,
// or effectively-silent audio.
export async function measureLufsClient(file: File): Promise<number | undefined> {
  try {
    const AudioContextCtor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const audioCtx = new AudioContextCtor();
    try {
      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      const channels = Array.from({ length: audioBuffer.numberOfChannels }, (_, i) =>
        audioBuffer.getChannelData(i),
      );
      const value = lufs(channels, { fs: audioBuffer.sampleRate });
      return value === null ? undefined : value;
    } finally {
      await audioCtx.close();
    }
  } catch {
    return undefined;
  }
}

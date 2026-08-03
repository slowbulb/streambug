"use client";

import { upload } from "@vercel/blob/client";

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

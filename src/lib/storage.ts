import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { del } from "@vercel/blob";

export type StoredFile = {
  url: string;
  key: string;
};

// When set, uploads go directly from the browser to Vercel Blob (see
// src/lib/clientUpload.ts + src/app/api/upload/route.ts), bypassing the
// serverless function body-size limit. Without it, files are written to
// public/uploads for local development, where the process's disk persists
// between requests.
export function isBlobStorageEnabled(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

const LOCAL_UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100);
}

/** Local-disk fallback for saving an uploaded file (dev only, no Blob configured). */
export async function saveUploadedFile(
  file: File,
  folder: "audio" | "covers",
): Promise<StoredFile> {
  const key = `${folder}/${crypto.randomUUID()}-${safeName(file.name)}`;
  await mkdir(path.join(LOCAL_UPLOAD_DIR, folder), { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  const filePath = path.join(LOCAL_UPLOAD_DIR, key);
  await writeFile(filePath, buffer);
  return { url: `/uploads/${key}`, key };
}

export async function deleteUploadedFile(key: string): Promise<void> {
  if (isBlobStorageEnabled()) {
    await del(key).catch(() => {});
    return;
  }
  const filePath = path.join(LOCAL_UPLOAD_DIR, key);
  await unlink(filePath).catch(() => {});
}

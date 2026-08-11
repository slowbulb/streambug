"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { quickAddTrackAction } from "@/app/actions";
import { useIsOwner } from "@/components/AuthProvider";
import { analyzeAudioClient, probeDurationClient, uploadFileDirect } from "@/lib/clientUpload";
import { titleFromFilename } from "@/lib/formatLufs";

type UploadStatus = {
  id: string;
  fileName: string;
  state: "uploading" | "done" | "error";
  message?: string;
};

function hasFiles(e: DragEvent): boolean {
  return !!e.dataTransfer && Array.from(e.dataTransfer.types).includes("Files");
}

/**
 * Lets you drag audio files from your OS straight onto the app to upload
 * them as new tracks, named from the filename, with no form. Lives in the
 * root layout so it's active everywhere; drops on an album's page add the
 * track to that album (detected from the URL), otherwise it's a single.
 */
export function GlobalDropZone({ hasBlob }: { hasBlob: boolean }) {
  const isOwner = useIsOwner();
  const pathname = usePathname();
  const [isDragging, setIsDragging] = useState(false);
  const [uploads, setUploads] = useState<UploadStatus[]>([]);
  const dragCounter = useRef(0);

  const albumMatch = pathname.match(/^\/albums\/([^/]+)(?:\/|$)/);
  const currentAlbumId = albumMatch && albumMatch[1] !== "new" ? albumMatch[1] : undefined;

  useEffect(() => {
    if (!isOwner) return;

    async function handleFile(file: File) {
      const id = crypto.randomUUID();
      setUploads((u) => [...u, { id, fileName: file.name, state: "uploading" }]);

      try {
        const formData = new FormData();
        formData.set("title", titleFromFilename(file.name));
        formData.set("originalFilename", file.name);
        if (currentAlbumId) formData.set("albumId", currentAlbumId);

        const analysis = await analyzeAudioClient(file);
        if (analysis.lufs !== undefined) formData.set("lufs", String(analysis.lufs));
        if (analysis.waveformPeaks) {
          formData.set("waveformPeaks", JSON.stringify(analysis.waveformPeaks));
        }

        if (hasBlob) {
          const duration = await probeDurationClient(file);
          if (duration) formData.set("durationSec", String(duration));
          const stored = await uploadFileDirect(file, "audio");
          formData.set("audioUrl", stored.url);
          formData.set("audioKey", stored.key);
          formData.set("mimeType", file.type || "application/octet-stream");
          formData.set("fileSize", String(file.size));
        } else {
          formData.set("audio", file);
        }

        await quickAddTrackAction(formData);
        setUploads((u) => u.map((x) => (x.id === id ? { ...x, state: "done" } : x)));
        setTimeout(() => setUploads((u) => u.filter((x) => x.id !== id)), 4000);
      } catch (err) {
        setUploads((u) =>
          u.map((x) =>
            x.id === id
              ? { ...x, state: "error", message: err instanceof Error ? err.message : "Upload failed" }
              : x,
          ),
        );
      }
    }

    function onDragEnter(e: DragEvent) {
      if (!hasFiles(e)) return;
      e.preventDefault();
      dragCounter.current += 1;
      setIsDragging(true);
    }
    function onDragOver(e: DragEvent) {
      if (!hasFiles(e)) return;
      e.preventDefault();
    }
    function onDragLeave(e: DragEvent) {
      if (!hasFiles(e)) return;
      dragCounter.current = Math.max(0, dragCounter.current - 1);
      if (dragCounter.current === 0) setIsDragging(false);
    }
    function onDrop(e: DragEvent) {
      if (!hasFiles(e)) return;
      e.preventDefault();
      dragCounter.current = 0;
      setIsDragging(false);

      const files = Array.from(e.dataTransfer?.files ?? []).filter(
        (f) => !f.type || f.type.startsWith("audio/"),
      );
      for (const file of files) void handleFile(file);
    }

    window.addEventListener("dragenter", onDragEnter);
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("dragleave", onDragLeave);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragenter", onDragEnter);
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("dragleave", onDragLeave);
      window.removeEventListener("drop", onDrop);
    };
  }, [currentAlbumId, hasBlob, isOwner]);

  if (!isOwner) return null;

  return (
    <>
      {isDragging && (
        <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center border-4 border-dashed border-accent bg-accent/10 backdrop-blur-sm">
          <p className="rounded-lg bg-surface px-6 py-4 text-lg font-medium shadow-lg">
            Drop audio files to add them{currentAlbumId ? " to this album" : ""}
          </p>
        </div>
      )}
      {uploads.length > 0 && (
        <div className="fixed right-4 top-20 z-40 flex w-72 flex-col gap-2">
          {uploads.map((u) => (
            <div
              key={u.id}
              className={`rounded-md border px-3 py-2 text-xs shadow-lg ${
                u.state === "error"
                  ? "border-red-300 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/60 dark:text-red-300"
                  : "border-border bg-surface"
              }`}
            >
              <p className="truncate font-medium">{u.fileName}</p>
              <p className="text-muted">
                {u.state === "uploading" && "Uploading…"}
                {u.state === "done" && "Added"}
                {u.state === "error" && (u.message ?? "Failed")}
              </p>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

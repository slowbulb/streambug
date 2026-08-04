"use client";

import { useEffect, useRef, useState } from "react";
import { splitVersionIntoTrackAction } from "@/app/actions";
import { VERSION_DRAG_MIME } from "@/lib/dragTypes";

function isVersionDrag(e: DragEvent): boolean {
  return !!e.dataTransfer && Array.from(e.dataTransfer.types).includes(VERSION_DRAG_MIME);
}

/**
 * Drag a version out of its track's expanded version list and drop it
 * anywhere on the page to split it into a brand new, standalone track — the
 * reverse of the merge-onto-a-track gesture. Lives in the root layout,
 * mirroring GlobalDropZone's full-page-overlay pattern for OS file drops,
 * but keyed on the custom VERSION_DRAG_MIME type instead of dragged files so
 * the two never trigger on each other's drags.
 */
export function VersionDragZone() {
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState<"idle" | "working" | "error">("idle");
  const dragCounter = useRef(0);

  useEffect(() => {
    function onDragEnter(e: DragEvent) {
      if (!isVersionDrag(e)) return;
      e.preventDefault();
      dragCounter.current += 1;
      setIsDragging(true);
    }
    function onDragOver(e: DragEvent) {
      if (!isVersionDrag(e)) return;
      e.preventDefault();
    }
    function onDragLeave(e: DragEvent) {
      if (!isVersionDrag(e)) return;
      dragCounter.current = Math.max(0, dragCounter.current - 1);
      if (dragCounter.current === 0) setIsDragging(false);
    }
    async function onDrop(e: DragEvent) {
      if (!isVersionDrag(e)) return;
      e.preventDefault();
      dragCounter.current = 0;
      setIsDragging(false);

      const raw = e.dataTransfer?.getData(VERSION_DRAG_MIME);
      if (!raw) return;
      try {
        const { versionId } = JSON.parse(raw) as { versionId: string };
        setStatus("working");
        await splitVersionIntoTrackAction(versionId);
        setStatus("idle");
      } catch {
        setStatus("error");
        setTimeout(() => setStatus("idle"), 3000);
      }
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
  }, []);

  if (!isDragging && status === "idle") return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center border-4 border-dashed border-accent bg-accent/10 backdrop-blur-sm">
      <p className="rounded-lg bg-surface px-6 py-4 text-lg font-medium shadow-lg">
        {status === "working"
          ? "Splitting into a new track…"
          : status === "error"
            ? "Couldn't split that version into a track."
            : "Drop anywhere to make this its own track"}
      </p>
    </div>
  );
}

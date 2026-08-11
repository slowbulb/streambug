"use client";

import { useState, useTransition } from "react";
import { updatePlainLyricsAction } from "@/app/actions";
import { useIsOwner } from "@/components/AuthProvider";

/**
 * Inline paste-and-save lyrics box, not time-synced — just plain text,
 * stored and shown as-is. Separate from the per-version LRC-based synced
 * lyrics editor on the track detail page.
 */
export function LyricsEditor({
  trackId,
  initialText,
}: {
  trackId: string;
  initialText: string | null;
}) {
  const isOwner = useIsOwner();
  const [savedText, setSavedText] = useState(initialText);
  const [editing, setEditing] = useState(!initialText);
  const [draft, setDraft] = useState(initialText ?? "");
  const [isPending, startTransition] = useTransition();

  if (!isOwner) {
    return savedText ? (
      <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap text-sm">{savedText}</pre>
    ) : (
      <p className="text-sm text-muted">No lyrics yet.</p>
    );
  }

  function handleSave() {
    const trimmed = draft.trim();
    const formData = new FormData();
    formData.set("lyrics", trimmed);
    startTransition(async () => {
      await updatePlainLyricsAction(trackId, formData);
      setSavedText(trimmed || null);
      setEditing(!trimmed);
    });
  }

  if (!editing) {
    return (
      <div className="flex flex-col gap-2">
        <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap text-sm">{savedText}</pre>
        <button
          onClick={() => {
            setDraft(savedText ?? "");
            setEditing(true);
          }}
          className="self-start text-xs text-accent hover:underline"
        >
          Edit lyrics
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Paste lyrics here…"
        rows={8}
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
      />
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={isPending}
          className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Saving…" : "Save lyrics"}
        </button>
        {savedText && (
          <button
            onClick={() => setEditing(false)}
            className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-surface"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

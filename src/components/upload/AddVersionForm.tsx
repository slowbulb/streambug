"use client";

import { addVersionAction } from "@/app/actions";
import { useUploadSubmit } from "@/lib/useUploadSubmit";

export function AddVersionForm({ trackId, hasBlob }: { trackId: string; hasBlob: boolean }) {
  const { handleSubmit, isUploading, isPending, error } = useUploadSubmit(
    addVersionAction.bind(null, trackId),
    { fieldName: "audio", folder: "audio", urlField: "audioUrl", keyField: "audioKey", required: true, probeDuration: true },
    hasBlob,
  );

  const busy = isUploading || isPending;

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 sm:flex-row sm:items-end"
    >
      <label className="flex flex-1 flex-col gap-1 text-sm">
        Label
        <input
          name="label"
          required
          placeholder="e.g. Live, Acoustic, Remix"
          className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
        />
      </label>
      <label className="flex flex-1 flex-col gap-1 text-sm">
        Audio file
        <input type="file" name="audio" accept="audio/*" required className="text-sm" />
      </label>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="inline-flex items-center justify-center rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isUploading ? "Uploading…" : isPending ? "Saving…" : "Add version"}
      </button>
    </form>
  );
}

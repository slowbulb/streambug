"use client";

import { createTrackAction } from "@/app/actions";
import { useUploadSubmit } from "@/lib/useUploadSubmit";

export function NewTrackForm({
  albums,
  defaultAlbumId,
  hasBlob,
}: {
  albums: { id: string; title: string }[];
  defaultAlbumId?: string;
  hasBlob: boolean;
}) {
  const { handleSubmit, isUploading, isPending, error } = useUploadSubmit(
    createTrackAction,
    { fieldName: "audio", folder: "audio", urlField: "audioUrl", keyField: "audioKey", required: true, probeDuration: true },
    hasBlob,
  );

  const busy = isUploading || isPending;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        Title
        <input
          name="title"
          required
          autoFocus
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Album (optional)
        <select
          name="albumId"
          defaultValue={defaultAlbumId ?? ""}
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
        >
          <option value="">No album (single)</option>
          {albums.map((album) => (
            <option key={album.id} value={album.id}>
              {album.title}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Version label
        <input
          name="label"
          defaultValue="Original"
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Audio file
        <input type="file" name="audio" accept="audio/*" required className="text-sm" />
      </label>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="self-start rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isUploading ? "Uploading…" : isPending ? "Saving…" : "Upload"}
      </button>
    </form>
  );
}

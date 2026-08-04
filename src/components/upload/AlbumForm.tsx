"use client";

import { createAlbumAction, updateAlbumAction } from "@/app/actions";
import { useUploadSubmit } from "@/lib/useUploadSubmit";

export function AlbumForm({
  hasBlob,
  album,
}: {
  hasBlob: boolean;
  album?: { id: string; title: string; artist: string | null; description: string | null };
}) {
  const action = album ? updateAlbumAction.bind(null, album.id) : createAlbumAction;
  const { handleSubmit, isUploading, isPending, error } = useUploadSubmit(
    action,
    { fieldName: "cover", folder: "covers", urlField: "coverUrl", keyField: "coverKey" },
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
          defaultValue={album?.title}
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Artist (optional)
        <input
          name="artist"
          defaultValue={album?.artist ?? ""}
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Description (optional)
        <textarea
          name="description"
          rows={3}
          defaultValue={album?.description ?? ""}
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        {album ? "Replace cover image (optional)" : "Cover image (optional)"}
        <input type="file" name="cover" accept="image/*" className="text-sm" />
      </label>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="self-start rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isUploading ? "Uploading…" : isPending ? "Saving…" : album ? "Save changes" : "Create album"}
      </button>
    </form>
  );
}

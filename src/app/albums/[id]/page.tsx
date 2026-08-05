import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteAlbumAction } from "@/app/actions";
import { CassetteCover } from "@/components/CassetteCover";
import { DeleteButton } from "@/components/DeleteButton";
import { ReorderableTrackList } from "@/components/ReorderableTrackList";
import { getAlbumWithTracks } from "@/lib/queries";

export default async function AlbumPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getAlbumWithTracks(id);
  if (!result) notFound();
  const { album, tracks } = result;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="w-44 shrink-0 sm:w-56">
          <CassetteCover coverUrl={album.coverUrl} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <h1 className="text-2xl font-semibold">{album.title}</h1>
          {album.artist && <p className="text-sm text-muted">{album.artist}</p>}
          {album.description && <p className="text-sm text-muted">{album.description}</p>}
          <p className="text-xs text-muted">
            {tracks.length} track{tracks.length === 1 ? "" : "s"}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Link
              href={`/tracks/new?albumId=${album.id}`}
              className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground hover:opacity-90"
            >
              Add track
            </Link>
            <Link
              href={`/albums/${album.id}/edit`}
              className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-surface"
            >
              Edit
            </Link>
            <DeleteButton
              action={deleteAlbumAction.bind(null, album.id)}
              confirmMessage={`Delete "${album.title}"? Its tracks won't be deleted, just moved out of this album.`}
            />
          </div>
        </div>
      </div>

      {tracks.length === 0 ? (
        <p className="text-sm text-muted">No tracks in this album yet.</p>
      ) : (
        <>
          <p className="text-xs text-muted">
            Drag a track onto another to add it as a version, or into the gap between tracks to
            reorder.
          </p>
          <ReorderableTrackList
            albumId={album.id}
            albumTitle={album.title}
            albumArtist={album.artist}
            tracks={tracks}
          />
        </>
      )}
    </div>
  );
}

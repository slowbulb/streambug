import Link from "next/link";
import { TrackRow } from "@/components/TrackRow";
import { getRecentAlbums, getRecentTracks } from "@/lib/queries";

export default async function Home() {
  const [albums, tracks] = await Promise.all([getRecentAlbums(6), getRecentTracks(8)]);

  if (albums.length === 0 && tracks.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <h1 className="text-2xl font-semibold">Your music library is empty</h1>
        <p className="max-w-md text-muted">
          Upload your first track to get started. You can organize tracks into
          albums, add alternate versions, and add time-synced lyrics later.
        </p>
        <Link
          href="/tracks/new"
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90"
        >
          Upload a track
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Albums</h1>
          <Link href="/albums" className="text-sm text-accent hover:underline">
            View all
          </Link>
        </div>
        {albums.length === 0 ? (
          <p className="text-sm text-muted">
            No albums yet.{" "}
            <Link href="/albums/new" className="text-accent hover:underline">
              Create one
            </Link>
            .
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
            {albums.map((album) => (
              <Link key={album.id} href={`/albums/${album.id}`} className="group flex flex-col gap-2">
                <div className="aspect-square overflow-hidden rounded-lg border border-border bg-surface">
                  {album.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={album.coverUrl}
                      alt=""
                      className="h-full w-full object-cover transition group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-3xl">🎵</div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium group-hover:underline">{album.title}</p>
                  <p className="truncate text-xs text-muted">
                    {album.artist ? `${album.artist} · ` : ""}
                    {album._count.tracks} track{album._count.tracks === 1 ? "" : "s"}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Recently added</h1>
          <Link href="/tracks" className="text-sm text-accent hover:underline">
            View all
          </Link>
        </div>
        {tracks.length === 0 ? (
          <p className="text-sm text-muted">No tracks yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {tracks.map((track) => (
              <TrackRow key={track.id} track={track} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

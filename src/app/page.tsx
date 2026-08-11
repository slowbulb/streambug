import Link from "next/link";
import { AlbumRack } from "@/components/AlbumRack";
import { TrackRow } from "@/components/TrackRow";
import { isOwnerSession } from "@/lib/auth";
import { getRecentAlbums, getRecentTracks } from "@/lib/queries";

export default async function Home() {
  const [albums, tracks, isOwner] = await Promise.all([
    getRecentAlbums(6),
    getRecentTracks(8),
    isOwnerSession(),
  ]);

  if (albums.length === 0 && tracks.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <h1 className="text-2xl font-semibold">
          {isOwner ? "Your music library is empty" : "This library is empty"}
        </h1>
        {isOwner ? (
          <>
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
          </>
        ) : (
          <p className="max-w-md text-muted">Nothing has been uploaded yet.</p>
        )}
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
            No albums yet.
            {isOwner && (
              <>
                {" "}
                <Link href="/albums/new" className="text-accent hover:underline">
                  Create one
                </Link>
                .
              </>
            )}
          </p>
        ) : (
          <AlbumRack albums={albums} />
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

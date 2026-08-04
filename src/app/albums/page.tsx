import Link from "next/link";
import { getAllAlbums } from "@/lib/queries";

export default async function AlbumsPage() {
  const albums = await getAllAlbums();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Albums</h1>
        <Link
          href="/albums/new"
          className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground hover:opacity-90"
        >
          New album
        </Link>
      </div>

      {albums.length === 0 ? (
        <p className="text-sm text-muted">No albums yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
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
    </div>
  );
}

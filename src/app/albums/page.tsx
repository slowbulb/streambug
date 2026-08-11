import Link from "next/link";
import { AlbumRack } from "@/components/AlbumRack";
import { isOwnerSession } from "@/lib/auth";
import { getAllAlbums } from "@/lib/queries";

export default async function AlbumsPage() {
  const [albums, isOwner] = await Promise.all([getAllAlbums(), isOwnerSession()]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Albums</h1>
        {isOwner && (
          <Link
            href="/albums/new"
            className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground hover:opacity-90"
          >
            New album
          </Link>
        )}
      </div>

      {albums.length === 0 ? (
        <p className="text-sm text-muted">No albums yet.</p>
      ) : (
        <AlbumRack albums={albums} />
      )}
    </div>
  );
}

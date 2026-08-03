import Link from "next/link";
import { TrackRow } from "@/components/TrackRow";
import { getAllTracks } from "@/lib/queries";

export default async function TracksPage() {
  const tracks = await getAllTracks();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">All tracks</h1>
        <Link
          href="/tracks/new"
          className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground hover:opacity-90"
        >
          Upload
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
    </div>
  );
}

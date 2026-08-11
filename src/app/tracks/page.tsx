import Link from "next/link";
import { BackfillWaveforms } from "@/components/BackfillWaveforms";
import { MergeableTrackList } from "@/components/MergeableTrackList";
import { isOwnerSession } from "@/lib/auth";
import { getAllTracks, getVersionsMissingWaveform } from "@/lib/queries";

export default async function TracksPage() {
  const isOwner = await isOwnerSession();
  const [tracks, missingWaveform] = await Promise.all([
    getAllTracks(),
    isOwner ? getVersionsMissingWaveform() : Promise.resolve([]),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">All tracks</h1>
        {isOwner && (
          <Link
            href="/tracks/new"
            className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground hover:opacity-90"
          >
            Upload
          </Link>
        )}
      </div>

      {isOwner && (
        <BackfillWaveforms
          versions={missingWaveform.map((v) => ({
            id: v.id,
            audioUrl: v.audioUrl,
            trackTitle: v.track.title,
          }))}
        />
      )}

      {tracks.length === 0 ? (
        <p className="text-sm text-muted">No tracks yet.</p>
      ) : (
        <>
          {isOwner && (
            <p className="text-xs text-muted">
              Drag one track onto another to fold it in as a new version of that track.
            </p>
          )}
          <MergeableTrackList tracks={tracks} />
        </>
      )}
    </div>
  );
}

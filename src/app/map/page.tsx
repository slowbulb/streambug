import { LibraryMap } from "@/components/LibraryMap";
import { getLibraryMap } from "@/lib/queries";

export default async function MapPage() {
  const { albums, tracks } = await getLibraryMap();

  if (albums.length === 0 && tracks.length === 0) {
    return <p className="text-sm text-muted">Nothing to map yet — upload a track to get started.</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Map</h1>
        <p className="text-sm text-muted">
          Drag a track onto an album to move it there, or onto another track to reorder — works
          across albums too.
        </p>
      </div>
      <LibraryMap albums={albums} tracks={tracks} />
    </div>
  );
}

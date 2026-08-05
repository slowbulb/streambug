import Link from "next/link";
import { AlbumPlayButton } from "@/components/AlbumPlayButton";
import { CassetteCover } from "@/components/CassetteCover";
import { toPlayerTrack } from "@/lib/toPlayerTrack";
import type { AlbumListItem } from "@/lib/queries";

/**
 * Albums displayed like cassettes standing in a rack: a grid of cases on a
 * dark wood-toned shelf background, rather than a list. Hardcoded shelf/ink
 * colors (like CassetteTrackRow) — meant to look like a physical rack
 * regardless of the site's light/dark theme.
 */
export function AlbumRack({ albums }: { albums: AlbumListItem[] }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-7 rounded-md border border-[#2a2118] bg-[repeating-linear-gradient(180deg,#4a3b28,#4a3b28_18px,#3f331f_18px,#3f331f_20px)] p-4 shadow-[inset_0_2px_10px_rgba(0,0,0,0.4)] sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {albums.map((album) => {
        const firstTrack = album.tracks[0];
        return (
          <Link
            key={album.id}
            href={`/albums/${album.id}`}
            className="group flex flex-col gap-1.5 transition-transform hover:-translate-y-1"
          >
            <div className="relative">
              <CassetteCover
                coverUrl={album.coverUrl}
                className="shadow-[0_6px_10px_rgba(0,0,0,0.45)]"
              />
              {firstTrack && (
                <AlbumPlayButton
                  track={toPlayerTrack(firstTrack)}
                  albumId={album.id}
                  className="absolute right-1.5 top-1.5"
                />
              )}
            </div>
            <div className="px-0.5">
              <p className="truncate text-xs font-bold uppercase tracking-wide text-[#f4ecd8] group-hover:text-[#e0655f]">
                {album.title}
              </p>
              {album.artist && (
                <p className="truncate text-[10px] uppercase tracking-wide text-[#c9bb95]">
                  {album.artist}
                </p>
              )}
              <p className="text-[10px] tracking-wide text-[#8a7a5c]">
                {album._count.tracks} track{album._count.tracks === 1 ? "" : "s"}
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

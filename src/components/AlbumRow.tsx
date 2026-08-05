import Link from "next/link";
import { CassetteCover } from "@/components/CassetteCover";

export function AlbumRow({
  album,
}: {
  album: {
    id: string;
    title: string;
    artist: string | null;
    coverUrl: string | null;
    _count: { tracks: number };
  };
}) {
  return (
    <Link
      href={`/albums/${album.id}`}
      className="group flex items-center gap-4 rounded-lg border border-border bg-surface px-3 py-2.5 hover:border-accent"
    >
      <div className="w-24 shrink-0">
        <CassetteCover coverUrl={album.coverUrl} />
      </div>
      <span className="min-w-0 flex-1 text-lg font-bold group-hover:underline">{album.title}</span>
      {album.artist && (
        <span className="shrink-0 text-right text-lg font-bold text-foreground">{album.artist}</span>
      )}
      <span className="shrink-0 text-xs text-muted">
        {album._count.tracks} track{album._count.tracks === 1 ? "" : "s"}
      </span>
    </Link>
  );
}

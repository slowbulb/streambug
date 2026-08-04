import Link from "next/link";

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
      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md border border-border bg-background">
        {album.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={album.coverUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-2xl">🎵</div>
        )}
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

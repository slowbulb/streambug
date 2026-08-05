/**
 * An album's cover art framed like a physical case front — a cassette
 * J-card or vinyl sleeve — rather than a plain square thumbnail: a dark
 * case bezel around the artwork with a subtle shadow. Same cover image,
 * just framed differently; no reel graphic (that's reserved for the
 * player bar, where it's actually meaningful as a playing/paused state).
 */
export function CassetteCover({
  coverUrl,
  className = "",
}: {
  coverUrl: string | null;
  className?: string;
}) {
  return (
    <div
      className={`relative aspect-square w-full overflow-hidden rounded-sm border-2 border-[#1c1712] bg-[#f4ecd8] shadow-[0_4px_10px_rgba(0,0,0,0.35)] ${className}`}
    >
      {coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={coverUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-2xl">🎵</div>
      )}
      <div className="pointer-events-none absolute inset-0 rounded-sm ring-1 ring-inset ring-black/25" />
    </div>
  );
}

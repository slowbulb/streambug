import { CassetteReel } from "@/components/CassetteReel";

/**
 * Wraps an album's cover art in a stylized cassette shell: the cover sits in
 * the label window, with two reels and a tape strand below it, like the
 * cover were the printed label on a physical cassette. Pure CSS/SVG, no
 * image processing — same cover image, just framed differently.
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
      className={`relative flex aspect-[3/2] w-full flex-col gap-[4%] rounded-md bg-gradient-to-b from-[#3a322a] to-[#1c1712] p-[6%] shadow-[0_2px_8px_rgba(0,0,0,0.35)] ${className}`}
    >
      <Screw className="left-1 top-1" />
      <Screw className="right-1 top-1" />
      <Screw className="bottom-1 left-1" />
      <Screw className="bottom-1 right-1" />

      <div className="relative h-[60%] w-full overflow-hidden rounded-[2px] border border-black/40 bg-[#f4ecd8]">
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-lg">🎵</div>
        )}
      </div>

      <div className="relative flex flex-1 items-center justify-between px-[8%]">
        <CassetteReel className="h-full" />
        <div className="mx-1.5 h-px flex-1 bg-[#5a4f42]" />
        <CassetteReel className="h-full" />
      </div>
    </div>
  );
}

function Screw({ className }: { className: string }) {
  return (
    <div
      className={`absolute h-[3%] w-[3%] min-h-[3px] min-w-[3px] rounded-full bg-black/70 shadow-[0_0_0_1px_rgba(255,255,255,0.08)] ${className}`}
    />
  );
}

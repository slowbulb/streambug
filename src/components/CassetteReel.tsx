/** A single cassette reel hub with cross-spokes. Spins via CSS animation
 * (paused/running toggled by `spinning`) rather than JS, so it's cheap to
 * mount many of them. */
export function CassetteReel({
  spinning = false,
  className = "",
}: {
  spinning?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`relative aspect-square shrink-0 rounded-full bg-[#0d0b09] shadow-[inset_0_0_3px_rgba(0,0,0,0.9)] ${className}`}
    >
      <div
        className="absolute inset-0"
        style={{
          animation: "cassette-spin 2.2s linear infinite",
          animationPlayState: spinning ? "running" : "paused",
        }}
      >
        <div className="absolute inset-[28%] rounded-full border border-[#5a4f42]" />
        <div className="absolute inset-0 flex items-center justify-center rotate-0">
          <div className="h-[65%] w-px bg-[#5a4f42]" />
        </div>
        <div className="absolute inset-0 flex items-center justify-center rotate-60">
          <div className="h-[65%] w-px bg-[#5a4f42]" />
        </div>
        <div className="absolute inset-0 flex items-center justify-center rotate-120">
          <div className="h-[65%] w-px bg-[#5a4f42]" />
        </div>
      </div>
    </div>
  );
}

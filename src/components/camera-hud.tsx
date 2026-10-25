const READOUT = ["4K", "24P", "1/48", "ƒ2.8", "ISO 800"];

/** Cinema-camera monitor overlay for the header: camera ID, recording settings and battery. */
export function CameraHud({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`items-center gap-3 font-mono text-[10px] uppercase tracking-[0.22em] text-white/50 ${className}`}
    >
      <span className="rounded-[3px] border border-orange-400/50 px-1.5 py-0.5 font-semibold text-orange-300 [text-shadow:0_0_10px_rgba(251,146,60,0.55)] shadow-[0_0_12px_-4px_rgba(251,146,60,0.6)]">
        Cam A
      </span>
      <span className="text-orange-400/80">▸</span>
      {READOUT.map((value, i) => (
        <span key={value} className="flex items-center gap-3">
          {i > 0 ? <span className="h-1 w-1 rounded-full bg-white/25" /> : null}
          <span className="text-white/70">{value}</span>
        </span>
      ))}
      {/* Battery */}
      <span className="ml-1 flex items-center gap-[2px]">
        <span className="flex h-[10px] w-[20px] items-center gap-[1.5px] rounded-[2px] border border-white/45 p-[1.5px]">
          <span className="h-full flex-1 rounded-[1px] bg-white/70" />
          <span className="h-full flex-1 rounded-[1px] bg-white/70" />
          <span className="h-full flex-1 rounded-[1px] bg-white/70" />
          <span className="h-full flex-1 rounded-[1px] bg-white/20" />
        </span>
        <span className="h-[4px] w-[2px] rounded-r-[1px] bg-white/45" />
      </span>
    </div>
  );
}

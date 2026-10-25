const pad2 = (n: number) => String(n).padStart(2, "0");

type SceneSlateProps = {
  /** Matches the section's clip number on the timeline. */
  scene: number;
  label: string;
  className?: string;
};

/** Film-slate marker above a section: scene number (playhead orange), section name, take. */
export function SceneSlate({ scene, label, className = "" }: SceneSlateProps) {
  return (
    <div
      aria-hidden
      className={`flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.3em] text-white/45 md:text-[11px] ${className}`}
    >
      <span className="font-semibold text-orange-400 [text-shadow:0_0_10px_rgba(251,146,60,0.45)]">
        SC {pad2(scene)}
      </span>
      <span className="h-3 w-px bg-white/20" />
      <span className="text-white/75">{label}</span>
      <span className="h-px flex-1 bg-gradient-to-r from-orange-400/60 via-white/[0.08] to-transparent" />
      <span>Take 01</span>
    </div>
  );
}

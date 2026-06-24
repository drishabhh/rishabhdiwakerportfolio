"use client";

import type { CSSProperties, ReactNode } from "react";
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { MasterResume } from "@/lib/resumeData";
import { REFERENCE_RESUME_LAYOUT, clampContentScale, type ResumeLayout } from "@/lib/resume-layout-reference";
import {
  computeResumeContentScale,
  contentExceedsPageBounds,
  layoutForFitMeasurement,
  PAGE_CONTENT_HEIGHT_PT,
  PAGE_MARGIN_PT,
} from "@/lib/resume-page-fit";
import {
  getFieldFormat,
  mergeFieldFormat,
  moveSection,
  SECTION_LABELS,
  A4_HEIGHT_PT,
  A4_WIDTH_PT,
  DEFAULT_PAGE_DESIGN,
  type EditorSnapshot,
  type FieldFormat,
  type LinkField,
  type PageDesign,
  type ResumeEditorExtras,
  type ResumeSectionId,
} from "@/lib/resume-editor-state";
import { applyHtmlFieldFormat } from "@/lib/field-format-style";
import { splitBoldSpans } from "@/lib/resume-bold-spans";
import { useMeasuredAutoFit } from "@/lib/use-measured-autofit";
import { filterNonemptyCertifications, filterNonemptyEducation } from "@/lib/resume-preserve";
import { ResumeFormatToolbar } from "@/components/ResumeFormatToolbar";
import {
  AlertTriangle,
  Grid3x3,
  GripVertical,
  ImageIcon,
  LayoutGrid,
  Redo2,
  RotateCcw,
  Undo2,
  Upload,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

function IconBtn({
  title,
  onClick,
  disabled,
  active,
  children,
}: {
  title: string;
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`rounded p-1 ${active ? "bg-violet-600 text-white" : "text-zinc-600 hover:bg-zinc-100 disabled:opacity-40"}`}
    >
      {children}
    </button>
  );
}

export type SnapshotChangeMode = "commit" | "debounce" | "replace";

type Props = {
  snapshot: EditorSnapshot;
  photoSrc?: string;
  onSnapshotChange: (next: EditorSnapshot, mode: SnapshotChangeMode) => void;
  onFlushHistory: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onPageOverflowChange?: (overflow: boolean) => void;
};

const PAGE_OVERFLOW_TOLERANCE_PX = 2;

function scalePx(value: number, layout: ResumeLayout) {
  return value * layout.spacingScale;
}

function applyFormatStyle(base: CSSProperties, format: FieldFormat): CSSProperties {
  return applyHtmlFieldFormat(base, format);
}

function patchSnapshot(
  snapshot: EditorSnapshot,
  patch: Partial<EditorSnapshot> & {
    resume?: MasterResume;
    layout?: ResumeLayout;
    extras?: ResumeEditorExtras;
  },
): EditorSnapshot {
  return {
    resume: patch.resume ?? snapshot.resume,
    layout: patch.layout ?? snapshot.layout,
    extras: patch.extras ?? snapshot.extras,
  };
}

function EditableField({
  fieldId,
  value,
  onChange,
  onBlur,
  onFocus,
  format,
  style,
  className = "",
  multiline = false,
  placeholder = "",
  link,
}: {
  fieldId: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  onFocus?: (fieldId: string) => void;
  format?: FieldFormat;
  style?: CSSProperties;
  className?: string;
  multiline?: boolean;
  placeholder?: string;
  link?: { url: string; enabled: boolean };
}) {
  const [active, setActive] = useState(false);
  const ref = useRef<HTMLTextAreaElement | HTMLInputElement>(null);
  const displayStyle = applyFormatStyle(style ?? {}, format ?? {});

  const finish = (v: string) => {
    onChange(v);
    setActive(false);
    onBlur?.();
  };

  if (active) {
    const shared = {
      ref: ref as React.RefObject<HTMLTextAreaElement & HTMLInputElement>,
      defaultValue: value,
      placeholder,
      style: displayStyle,
      className: `w-full min-w-[1em] resize-none rounded border border-violet-400 bg-violet-50/40 px-0.5 py-0 outline-none ring-1 ring-violet-300 ${className}`,
      onFocus: () => onFocus?.(fieldId),
      onBlur: (e: React.FocusEvent<HTMLTextAreaElement | HTMLInputElement>) =>
        finish(e.target.value),
      onKeyDown: (e: React.KeyboardEvent) => {
        if (!multiline && e.key === "Enter") {
          e.preventDefault();
          finish((e.target as HTMLInputElement).value);
        }
        if (e.key === "Escape") setActive(false);
      },
    };
    return multiline ? <textarea rows={3} {...shared} /> : <input type="text" {...shared} />;
  }

  if (!value && !active) {
    return (
      <span
        role="button"
        tabIndex={0}
        data-field-id={fieldId}
        onClick={() => {
          onFocus?.(fieldId);
          setActive(true);
          requestAnimationFrame(() => ref.current?.focus());
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            onFocus?.(fieldId);
            setActive(true);
          }
        }}
        style={{ ...displayStyle, minWidth: "0.5em", minHeight: "1em", display: "inline-block" }}
        className={`cursor-text rounded hover:bg-violet-100/60 hover:outline hover:outline-1 hover:outline-violet-300 ${className}`}
        title="Click to edit"
      >
        {"\u00A0"}
      </span>
    );
  }

  const spans = splitBoldSpans(value);
  const content =
    spans.length === 1 && !spans[0]!.bold
      ? value
      : spans.map((span, i) =>
          span.bold ? <strong key={i}>{span.text}</strong> : <span key={i}>{span.text}</span>,
        );
  const inner = link?.enabled && link.url && !active ? (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className="underline decoration-violet-400/60 underline-offset-2"
      onClick={(e) => e.stopPropagation()}
    >
      {content}
    </a>
  ) : (
    content
  );

  return (
    <span
      role="button"
      tabIndex={0}
      data-field-id={fieldId}
      onClick={() => {
        onFocus?.(fieldId);
        setActive(true);
        requestAnimationFrame(() => ref.current?.focus());
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          onFocus?.(fieldId);
          setActive(true);
        }
      }}
      style={displayStyle}
      className={`cursor-text rounded px-0.5 transition hover:bg-violet-100/60 hover:outline hover:outline-1 hover:outline-violet-300 ${className} ${format?.bullet ? "ml-3 list-item list-disc" : ""}`}
      title="Click to edit"
    >
      {inner}
    </span>
  );
}

function LayoutSlider({
  label,
  value,
  min,
  max,
  step = 1,
  unit = "",
  onChange,
  onCommit,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
  onCommit?: () => void;
}) {
  return (
    <label className="block text-[10px]">
      <span className="flex justify-between text-zinc-500">
        <span>{label}</span>
        <span className="font-mono text-zinc-700">
          {step < 1 ? value.toFixed(2) : value}
          {unit}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        onMouseUp={onCommit}
        onTouchEnd={onCommit}
        className="mt-0.5 h-1 w-full accent-violet-600"
      />
    </label>
  );
}

function ColorInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-1 text-[10px] text-zinc-500">
      <span>{label}</span>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-5 w-8 cursor-pointer rounded border border-zinc-200 bg-white p-0"
      />
    </label>
  );
}

function InlineSlider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  onCommit,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  onCommit?: () => void;
}) {
  return (
    <label className="flex min-w-[72px] flex-1 items-center gap-1 text-[9px] text-zinc-600">
      <span className="shrink-0">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        onMouseUp={onCommit}
        onTouchEnd={onCommit}
        className="h-1 min-w-0 flex-1 accent-violet-600"
      />
      <span className="w-7 shrink-0 text-right font-mono text-[8px] text-zinc-500">
        {step < 1 ? value.toFixed(2) : value}
      </span>
    </label>
  );
}

function PhotoToolbar({
  photo,
  photoBorderRadius,
  photoSize,
  onUpload,
  onPhotoChange,
  onDesignChange,
  onSizeChange,
  onCommit,
}: {
  photo: ResumeEditorExtras["photo"];
  photoBorderRadius: number;
  photoSize: number;
  onUpload: (file: File) => void;
  onPhotoChange: (patch: Partial<ResumeEditorExtras["photo"]>, mode?: SnapshotChangeMode) => void;
  onDesignChange: (patch: Partial<PageDesign>, mode?: SnapshotChangeMode) => void;
  onSizeChange: (size: number, mode?: SnapshotChangeMode) => void;
  onCommit: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1 border-t border-violet-100 px-1.5 py-1">
      <ImageIcon className="h-3 w-3 shrink-0 text-violet-600" />
      <span className="shrink-0 text-[9px] font-semibold text-violet-800">Photo</span>
      <label className="flex shrink-0 cursor-pointer items-center gap-0.5 rounded border border-dashed border-violet-300 px-1.5 py-0.5 text-[9px] text-violet-700 hover:bg-violet-50">
        <Upload className="h-3 w-3" />
        Upload
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onUpload(f);
          }}
        />
      </label>
      <InlineSlider
        label="Zoom"
        value={photo.scale}
        min={1}
        max={2.5}
        step={0.05}
        onChange={(v) => onPhotoChange({ scale: v }, "replace")}
        onCommit={onCommit}
      />
      <InlineSlider
        label="X"
        value={photo.posX}
        min={0}
        max={100}
        onChange={(v) => onPhotoChange({ posX: v }, "replace")}
        onCommit={onCommit}
      />
      <InlineSlider
        label="Y"
        value={photo.posY}
        min={0}
        max={100}
        onChange={(v) => onPhotoChange({ posY: v }, "replace")}
        onCommit={onCommit}
      />
      <InlineSlider
        label="Round"
        value={photoBorderRadius}
        min={0}
        max={50}
        onChange={(v) => onDesignChange({ photoBorderRadius: v }, "replace")}
        onCommit={onCommit}
      />
      <InlineSlider
        label="Size"
        value={photoSize}
        min={52}
        max={72}
        onChange={(v) => onSizeChange(v, "replace")}
        onCommit={onCommit}
      />
    </div>
  );
}

function DraggableSection({
  sectionId,
  column,
  index,
  onMove,
  children,
}: {
  sectionId: ResumeSectionId;
  column: "left" | "right";
  index: number;
  onMove: (sectionId: ResumeSectionId, col: "left" | "right", idx: number) => void;
  children: ReactNode;
}) {
  const [over, setOver] = useState(false);

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const dragged = e.dataTransfer.getData("section/id") as ResumeSectionId;
        if (dragged) onMove(dragged, column, index);
      }}
      className={`group relative rounded transition ${over ? "ring-2 ring-violet-400 ring-offset-2" : ""}`}
    >
      <div
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData("section/id", sectionId);
          e.dataTransfer.effectAllowed = "move";
        }}
        className="absolute -left-1 top-0 z-10 flex cursor-grab items-center gap-0.5 rounded bg-violet-600/90 px-0.5 py-1 text-white opacity-0 shadow transition group-hover:opacity-100 active:cursor-grabbing"
        title={`Drag ${SECTION_LABELS[sectionId]}`}
      >
        <GripVertical className="h-3 w-3" />
        <span className="max-w-[80px] truncate text-[9px] font-medium">{SECTION_LABELS[sectionId]}</span>
      </div>
      {children}
    </div>
  );
}

export function InteractiveResumeEditor({
  snapshot,
  photoSrc,
  onSnapshotChange,
  onFlushHistory,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onPageOverflowChange,
}: Props) {
  const { resume, layout, extras } = snapshot;
  const design = extras.design ?? DEFAULT_PAGE_DESIGN;
  const accent = design.accentColor;
  const muted = design.mutedColor;
  const textColor = design.textColor;
  const [showLayout, setShowLayout] = useState(false);
  const [zoom, setZoom] = useState(0.55);
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);
  const [pageOverflow, setPageOverflow] = useState(false);
  const pageRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const emit = useCallback(
    (next: EditorSnapshot, mode: SnapshotChangeMode) => onSnapshotChange(next, mode),
    [onSnapshotChange],
  );

  const updateResume = useCallback(
    (path: (string | number)[], value: unknown, mode: SnapshotChangeMode = "debounce") => {
      const nextResume = structuredClone(resume) as MasterResume;
      let cur: Record<string, unknown> = nextResume as unknown as Record<string, unknown>;
      for (let i = 0; i < path.length - 1; i++) {
        cur = cur[path[i]!] as Record<string, unknown>;
      }
      cur[path[path.length - 1]!] = value;
      emit(patchSnapshot(snapshot, { resume: nextResume }), mode);
    },
    [resume, snapshot, emit],
  );

  const patchLayout = (patch: Partial<ResumeLayout>, mode: SnapshotChangeMode = "commit") => {
    const next = { ...layout, ...patch };
    if (patch.leftColumnWidthPercent != null) {
      next.rightColumnWidthPercent = 100 - patch.leftColumnWidthPercent;
    }
    emit(patchSnapshot(snapshot, { layout: next }), mode);
  };

  const patchContentScale = (contentScale: number, mode: SnapshotChangeMode = "replace") => {
    patchLayout({ contentScale: clampContentScale(contentScale) }, mode);
  };

  const contentScale = layout.contentScale ?? 1;
  const fitInput = useMemo(() => ({ resume, layout, extras }), [resume, layout, extras]);
  const renderScale = useMemo(() => computeResumeContentScale(fitInput), [fitInput]);
  const displayLayout = useMemo(() => layoutForFitMeasurement(layout), [layout]);
  const sectionGap = displayLayout.sectionGap ?? 20;

  const patchExtras = (patch: Partial<ResumeEditorExtras>, mode: SnapshotChangeMode = "commit") => {
    emit(patchSnapshot(snapshot, { extras: { ...extras, ...patch } }), mode);
  };

  const patchPhoto = (patch: Partial<ResumeEditorExtras["photo"]>, mode: SnapshotChangeMode = "commit") => {
    emit(
      patchSnapshot(snapshot, { extras: { ...extras, photo: { ...extras.photo, ...patch } } }),
      mode,
    );
  };

  const handlePhotoUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      patchPhoto({ dataUrl: String(reader.result) }, "commit");
    };
    reader.readAsDataURL(file);
  };

  const patchDesign = (patch: Partial<PageDesign>, mode: SnapshotChangeMode = "commit") => {
    emit(
      patchSnapshot(snapshot, { extras: { ...extras, design: { ...extras.design, ...patch } } }),
      mode,
    );
  };

  const commitNow = () => emit(snapshot, "commit");

  const moveSectionHandler = (sectionId: ResumeSectionId, col: "left" | "right", idx: number) => {
    const order = moveSection(extras.sectionOrder, sectionId, col, idx);
    patchExtras({ sectionOrder: order }, "commit");
  };

  const activeFormat = activeFieldId ? getFieldFormat(extras, activeFieldId) : {};
  const linkFieldMap: Record<string, LinkField> = {
    "contact.email": "email",
    "contact.website": "website",
    "contact.linkedin": "linkedin",
  };
  const activeLinkField = activeFieldId ? linkFieldMap[activeFieldId] : undefined;

  const leftExperience = resume.experience.slice(0, layout.leftExperienceCount);
  const rightExperience = resume.experience.slice(layout.leftExperienceCount);
  const certifications = filterNonemptyCertifications(resume.certifications);
  const education = filterNonemptyEducation(resume.education);
  const imageSrc = extras.photo.dataUrl || photoSrc || resume.photoUrl;

  const bodySize = layout.bodyFontSize * layout.spacingScale;
  const headingSize = layout.sectionHeadingFontSize * layout.spacingScale;
  const nameSize = layout.nameFontSize * layout.spacingScale;
  const titleSize = layout.titleFontSize * layout.spacingScale;
  const roleSize = scalePx(9, layout);
  const metaSize = scalePx(8, layout);
  const colJustify = "flex-start";

  useMeasuredAutoFit({
    enabled: true,
    contentRef,
    targetHeightPt: PAGE_CONTENT_HEIGHT_PT,
    deps: [
      resume,
      layout.spacingScale,
      layout.bodyFontSize,
      layout.sectionHeadingFontSize,
      layout.nameFontSize,
      layout.titleFontSize,
      layout.photoSize,
      layout.leftColumnWidthPercent,
      layout.rightColumnWidthPercent,
      layout.columnGap,
      layout.sectionGap,
      layout.maxAchievements,
      layout.maxBulletsPerRole,
      layout.maxSkillsPerGroup,
      layout.leftExperienceCount,
      extras.sectionOrder,
    ],
    onFit: (autoFitScale) => {
      if (layout.autoFitScale === autoFitScale) return;
      patchLayout({ autoFitScale }, "replace");
    },
  });

  const measurePageOverflow = useCallback(() => {
    const content = contentRef.current;
    if (!content) return contentExceedsPageBounds(fitInput);

    const scaledHeight = content.scrollHeight * renderScale;
    return scaledHeight > PAGE_CONTENT_HEIGHT_PT + PAGE_OVERFLOW_TOLERANCE_PX;
  }, [fitInput, renderScale]);

  useLayoutEffect(() => {
    let frame = 0;

    const update = () => {
      const overflow = measurePageOverflow();
      setPageOverflow(overflow);
      onPageOverflowChange?.(overflow);
    };

    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };

    schedule();

    const targets = [pageRef.current, contentRef.current].filter(Boolean) as HTMLElement[];

    const observer = new ResizeObserver(schedule);
    for (const el of targets) observer.observe(el);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [measurePageOverflow, onPageOverflowChange, fitInput, zoom, imageSrc]);

  const gridStyle: CSSProperties | undefined = extras.showGrid
    ? {
        backgroundImage:
          "linear-gradient(to right, rgba(124,58,237,0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(124,58,237,0.1) 1px, transparent 1px)",
        backgroundSize: "20px 20px",
      }
    : undefined;

  const renderSection = (sectionId: ResumeSectionId, column: "left" | "right", index: number) => {
    const wrap = (node: ReactNode) => (
      <DraggableSection
        key={sectionId}
        sectionId={sectionId}
        column={column}
        index={index}
        onMove={moveSectionHandler}
      >
        {node}
      </DraggableSection>
    );

    switch (sectionId) {
      case "summary":
        return wrap(
          <section style={{ marginBottom: scalePx(4, layout) }}>
            <p style={{ fontSize: headingSize, fontWeight: 700, letterSpacing: 0.4, marginBottom: scalePx(5, layout) }}>
              SUMMARY
            </p>
            <EditableField
              fieldId="summary"
              value={resume.summary}
              onChange={(v) => updateResume(["summary"], v)}
              onBlur={onFlushHistory}
              onFocus={setActiveFieldId}
              format={getFieldFormat(extras, "summary")}
              multiline
              style={{ color: muted, lineHeight: 1.35, fontSize: bodySize, display: "block" }}
            />
          </section>,
        );
      case "achievements":
        return wrap(
          <section style={{ marginBottom: scalePx(4, layout) }}>
            <p style={{ fontSize: headingSize, fontWeight: 700, letterSpacing: 0.4, marginBottom: scalePx(5, layout) }}>
              KEY ACHIEVEMENTS
            </p>
            <ul>
              {resume.keyAchievements.map((item, i) => {
                const fid = `keyAchievements.${i}`;
                const fmt = getFieldFormat(extras, fid);
                return (
                  <li key={i} className="flex" style={{ marginBottom: scalePx(3, layout) }}>
                    <span style={{ width: 8 }}>{fmt.bullet === false ? "" : "•"}</span>
                    <EditableField
                      fieldId={fid}
                      value={item}
                      onChange={(v) => updateResume(["keyAchievements", i], v)}
                      onBlur={onFlushHistory}
                      onFocus={setActiveFieldId}
                      format={fmt}
                      multiline
                      style={{ flex: 1, color: muted, fontSize: bodySize }}
                    />
                  </li>
                );
              })}
            </ul>
          </section>,
        );
      case "experience-left":
        return wrap(
          <section style={{ marginBottom: scalePx(4, layout) }}>
            <p style={{ fontSize: headingSize, fontWeight: 700, letterSpacing: 0.4, marginBottom: scalePx(5, layout) }}>
              EXPERIENCE
            </p>
            {leftExperience.map((exp, i) => (
              <ExperienceBlock
                key={i}
                exp={exp}
                index={i}
                extras={extras}
                accent={accent}
                muted={muted}
                roleSize={roleSize}
                metaSize={metaSize}
                bodySize={bodySize}
                layout={layout}
                updateResume={updateResume}
                onFlushHistory={onFlushHistory}
                onFocus={setActiveFieldId}
              />
            ))}
          </section>,
        );
      case "experience-right":
        if (rightExperience.length === 0) return null;
        return wrap(
          <section style={{ marginBottom: scalePx(4, layout) }}>
            {rightExperience.map((exp, i) => (
              <ExperienceBlock
                key={i}
                exp={exp}
                index={i + layout.leftExperienceCount}
                extras={extras}
                accent={accent}
                muted={muted}
                roleSize={roleSize}
                metaSize={metaSize}
                bodySize={bodySize}
                layout={layout}
                updateResume={updateResume}
                onFlushHistory={onFlushHistory}
                onFocus={setActiveFieldId}
              />
            ))}
          </section>,
        );
      case "skills":
        return wrap(
          <section style={{ marginBottom: scalePx(4, layout) }}>
            <p style={{ fontSize: headingSize, fontWeight: 700, letterSpacing: 0.4, marginBottom: scalePx(5, layout) }}>
              SKILLS
            </p>
            {Object.entries(resume.skills).map(([group, items]) => (
              <div key={group} style={{ marginBottom: scalePx(5, layout) }}>
                <p style={{ fontWeight: 700, color: accent, fontSize: bodySize, marginBottom: scalePx(2, layout) }}>
                  {group}
                </p>
                {items.map((skill, si) => {
                  const fid = `skills.${group}.${si}`;
                  return (
                    <div key={si} className="flex" style={{ marginBottom: scalePx(1.5, layout), color: muted, fontSize: bodySize }}>
                      <span style={{ width: 8 }}>•</span>
                      <EditableField
                        fieldId={fid}
                        value={skill}
                        onChange={(v) => {
                          const next = structuredClone(resume) as MasterResume;
                          next.skills[group as keyof MasterResume["skills"]][si] = v;
                          emit(patchSnapshot(snapshot, { resume: next }), "debounce");
                        }}
                        onBlur={onFlushHistory}
                        onFocus={setActiveFieldId}
                        format={getFieldFormat(extras, fid)}
                        style={{ flex: 1 }}
                      />
                    </div>
                  );
                })}
              </div>
            ))}
          </section>,
        );
      case "certifications":
        if (certifications.length === 0) return null;
        return wrap(
          <section style={{ marginBottom: scalePx(4, layout) }}>
            <p style={{ fontSize: headingSize, fontWeight: 700, letterSpacing: 0.4, marginBottom: scalePx(5, layout) }}>
              CERTIFICATION
            </p>
            {certifications.map((c, i) => (
              <div key={i} style={{ marginBottom: scalePx(4, layout) }}>
                <EditableField
                  fieldId={`certifications.${i}.title`}
                  value={c.title}
                  onChange={(v) => updateResume(["certifications", i, "title"], v)}
                  onBlur={onFlushHistory}
                  onFocus={setActiveFieldId}
                  format={getFieldFormat(extras, `certifications.${i}.title`)}
                  style={{ fontWeight: 700, color: accent, fontSize: bodySize, display: "block" }}
                />
                <EditableField
                  fieldId={`certifications.${i}.detail`}
                  value={c.detail}
                  onChange={(v) => updateResume(["certifications", i, "detail"], v)}
                  onBlur={onFlushHistory}
                  onFocus={setActiveFieldId}
                  format={getFieldFormat(extras, `certifications.${i}.detail`)}
                  multiline
                  style={{ color: muted, fontSize: metaSize, lineHeight: 1.3, display: "block" }}
                />
              </div>
            ))}
          </section>,
        );
      case "education":
        if (education.length === 0) return null;
        return wrap(
          <section>
            <p style={{ fontSize: headingSize, fontWeight: 700, letterSpacing: 0.4, marginBottom: scalePx(5, layout) }}>
              EDUCATION
            </p>
            {education.map((e, i) => (
              <div key={i} className="flex" style={{ marginBottom: scalePx(3, layout) }}>
                <span style={{ width: 8 }}>•</span>
                <div>
                  {(["degree", "school", "location"] as const).map((key) => (
                    <EditableField
                      key={key}
                      fieldId={`education.${i}.${key}`}
                      value={e[key]}
                      onChange={(v) => updateResume(["education", i, key], v)}
                      onBlur={onFlushHistory}
                      onFocus={setActiveFieldId}
                      format={getFieldFormat(extras, `education.${i}.${key}`)}
                      style={{
                        fontWeight: key === "degree" ? 700 : 400,
                        color: muted,
                        fontSize: key === "degree" ? bodySize : metaSize,
                        display: "block",
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </section>,
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col gap-2 lg:flex-row lg:items-start">
      {showLayout ? (
        <aside className="w-full shrink-0 space-y-2 rounded-lg border border-zinc-200 bg-white p-2 text-[10px] lg:w-44">
          <p className="font-semibold text-zinc-800">Design</p>
          <LayoutSlider
            label="Content scale"
            value={Math.round((layout.contentScale ?? 1) * 100)}
            min={72}
            max={105}
            step={1}
            unit="%"
            onChange={(v) => patchContentScale(v / 100, "replace")}
            onCommit={commitNow}
          />
          <p className="text-[9px] leading-snug text-zinc-400">Scales the entire resume content block (text + photo) in one piece.</p>
          <ColorInput label="Background" value={design.pageBackgroundColor} onChange={(v) => patchDesign({ pageBackgroundColor: v })} />
          <ColorInput label="Accent" value={design.accentColor} onChange={(v) => patchDesign({ accentColor: v })} />
          <ColorInput label="Text" value={design.textColor} onChange={(v) => patchDesign({ textColor: v })} />
          <ColorInput label="Muted" value={design.mutedColor} onChange={(v) => patchDesign({ mutedColor: v })} />
          <LayoutSlider label="Page radius" value={design.pageBorderRadius} min={0} max={24} unit="px" onChange={(v) => patchDesign({ pageBorderRadius: v }, "replace")} onCommit={commitNow} />
          <LayoutSlider label="Photo round" value={design.photoBorderRadius} min={0} max={50} unit="%" onChange={(v) => patchDesign({ photoBorderRadius: v }, "replace")} onCommit={commitNow} />
          <label className="flex cursor-pointer items-center justify-center gap-1 rounded border border-dashed border-violet-300 px-2 py-1 text-violet-700">
            <Upload className="h-3 w-3" /> Photo
            <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePhotoUpload(f); }} />
          </label>
          <LayoutSlider label="Photo zoom" value={extras.photo.scale} min={1} max={2.5} step={0.05} onChange={(v) => patchPhoto({ scale: v }, "replace")} onCommit={commitNow} />
          <LayoutSlider label="Spacing" value={layout.spacingScale} min={0.82} max={1.12} step={0.01} onChange={(v) => patchLayout({ spacingScale: v }, "replace")} onCommit={commitNow} />
          <LayoutSlider label="Top pad" value={layout.pagePaddingTop} min={14} max={36} unit="pt" onChange={(v) => patchLayout({ pagePaddingTop: v }, "replace")} onCommit={commitNow} />
          <LayoutSlider label="Side pad" value={layout.pagePaddingHorizontal} min={16} max={36} unit="pt" onChange={(v) => patchLayout({ pagePaddingHorizontal: v }, "replace")} onCommit={commitNow} />
        </aside>
      ) : null}

      <div className="min-w-0 flex-1">
        <div className="sticky top-0 z-20 rounded-t-lg border border-b-0 border-zinc-200 bg-white/95 backdrop-blur">
          <div className="flex flex-wrap items-center gap-0.5 px-1.5 py-1">
            <IconBtn title="Undo (Ctrl+Z)" disabled={!canUndo} onClick={onUndo}><Undo2 className="h-3 w-3" /></IconBtn>
            <IconBtn title="Redo" disabled={!canRedo} onClick={onRedo}><Redo2 className="h-3 w-3" /></IconBtn>
            <span className="mx-0.5 h-4 w-px bg-zinc-200" />
            <IconBtn title="Layout panel" active={showLayout} onClick={() => setShowLayout((v) => !v)}><LayoutGrid className="h-3 w-3" /></IconBtn>
            <IconBtn title="Grid" active={extras.showGrid} onClick={() => patchExtras({ showGrid: !extras.showGrid }, "replace")}><Grid3x3 className="h-3 w-3" /></IconBtn>
            <IconBtn title="Reset" onClick={() => emit(patchSnapshot(snapshot, { layout: { ...REFERENCE_RESUME_LAYOUT } }), "commit")}><RotateCcw className="h-3 w-3" /></IconBtn>
            <span className="mx-0.5 h-4 w-px bg-zinc-200" />
            <span className="mx-0.5 h-4 w-px bg-zinc-200" />
            <label className="flex min-w-0 max-w-[200px] flex-1 items-center gap-1.5 px-1 text-[10px] text-zinc-500">
              <span className="shrink-0 whitespace-nowrap">Content scale</span>
              <input
                type="range"
                min={0.72}
                max={1.05}
                step={0.01}
                value={contentScale}
                onChange={(e) => patchContentScale(Number(e.target.value), "replace")}
                onMouseUp={commitNow}
                onTouchEnd={commitNow}
                className="h-1 min-w-0 flex-1 accent-violet-600"
                title="Scale all content together to fit one page"
              />
              <span className="w-9 shrink-0 text-right font-mono text-zinc-700">{Math.round(contentScale * 100)}%</span>
            </label>
            {activeFieldId ? (
              <>
                <span className="mx-0.5 h-4 w-px bg-zinc-200" />
                <ResumeFormatToolbar
                inline
                fieldId={activeFieldId}
                format={activeFormat}
                linkField={activeLinkField}
                linkConfig={activeLinkField ? extras.links[activeLinkField] : undefined}
                onFormat={(patch) => patchExtras(mergeFieldFormat(extras, activeFieldId, patch), "commit")}
                onLink={
                  activeLinkField
                    ? (patch) =>
                        patchExtras(
                          {
                            links: {
                              ...extras.links,
                              [activeLinkField]: { ...extras.links[activeLinkField], ...patch },
                            },
                          },
                          "commit",
                        )
                    : undefined
                }
              />
              </>
            ) : null}
            {!activeFieldId ? (
              <span className="hidden px-1 text-[10px] text-zinc-400 sm:inline">
                Click text to edit
              </span>
            ) : null}
            <span className="ml-auto flex items-center gap-0.5">
              <IconBtn title="Zoom out" onClick={() => setZoom((z) => Math.max(0.35, z - 0.06))}><ZoomOut className="h-3 w-3" /></IconBtn>
              <span className="w-8 text-center text-[10px] text-zinc-500">{Math.round(zoom * 100)}%</span>
              <IconBtn title="Zoom in" onClick={() => setZoom((z) => Math.min(1, z + 0.06))}><ZoomIn className="h-3 w-3" /></IconBtn>
            </span>
          </div>
          <PhotoToolbar
            photo={extras.photo}
            photoBorderRadius={design.photoBorderRadius}
            photoSize={layout.photoSize}
            onUpload={handlePhotoUpload}
            onPhotoChange={patchPhoto}
            onDesignChange={patchDesign}
            onSizeChange={(size, mode) => patchLayout({ photoSize: size }, mode)}
            onCommit={commitNow}
          />
          {pageOverflow ? (
            <div
              className="flex items-start gap-2 border-t border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950"
              role="status"
            >
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" aria-hidden />
              <p>
                <span className="font-semibold">Content exceeds one page.</span> Slide <strong>Content scale</strong> left
                to shrink everything, or shorten bullets and summary.
              </p>
            </div>
          ) : null}
        </div>

        <div className="overflow-x-auto rounded-b-lg border border-zinc-200 bg-zinc-200/60 p-2">
          <div className="mx-auto" style={{ width: A4_WIDTH_PT * zoom, height: A4_HEIGHT_PT * zoom }}>
            <div
              ref={pageRef}
              className={`origin-top-left shadow-md ${pageOverflow ? "overflow-hidden ring-2 ring-amber-400/80" : "overflow-hidden"}`}
              style={{
                width: A4_WIDTH_PT,
                height: A4_HEIGHT_PT,
                boxSizing: "border-box",
                padding: PAGE_MARGIN_PT,
                fontFamily: "Helvetica, Arial, sans-serif",
                backgroundColor: design.pageBackgroundColor,
                borderRadius: design.pageBorderRadius,
                transform: `scale(${zoom})`,
                position: "relative",
                ...gridStyle,
              }}
            >
              <div
                ref={contentRef}
                style={{
                  boxSizing: "border-box",
                  width: `${100 / renderScale}%`,
                  height: PAGE_CONTENT_HEIGHT_PT,
                  maxHeight: PAGE_CONTENT_HEIGHT_PT,
                  overflow: "hidden",
                  fontSize: bodySize,
                  color: textColor,
                  transform: `scale(${renderScale})`,
                  transformOrigin: "top left",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
              <div className="flex shrink-0 items-start justify-between">
                <div className="min-w-0 flex-1" style={{ paddingRight: scalePx(14, layout) }}>
                  <EditableField fieldId="name" value={resume.name} onChange={(v) => updateResume(["name"], v)} onBlur={onFlushHistory} onFocus={setActiveFieldId} format={getFieldFormat(extras, "name")} style={{ display: "block", fontSize: nameSize, fontWeight: 700, color: accent, marginBottom: scalePx(3, layout) }} />
                  <EditableField fieldId="title" value={resume.title} onChange={(v) => updateResume(["title"], v)} onBlur={onFlushHistory} onFocus={setActiveFieldId} format={getFieldFormat(extras, "title")} multiline style={{ display: "block", fontSize: titleSize, fontWeight: 700, lineHeight: 1.28, marginBottom: scalePx(7, layout), maxWidth: 400 }} />
                  <div className="flex flex-wrap items-center" style={{ gap: scalePx(10, layout), fontSize: bodySize }}>
                    <EditableField fieldId="contact.email" value={resume.email} onChange={(v) => updateResume(["email"], v)} onBlur={onFlushHistory} onFocus={setActiveFieldId} format={getFieldFormat(extras, "contact.email")} link={{ url: extras.links.email.url, enabled: extras.links.email.enabled }} style={{ color: accent }} />
                    <EditableField fieldId="contact.website" value={resume.website} onChange={(v) => updateResume(["website"], v)} onBlur={onFlushHistory} onFocus={setActiveFieldId} format={getFieldFormat(extras, "contact.website")} link={{ url: extras.links.website.url, enabled: extras.links.website.enabled }} style={{ color: accent }} />
                    <EditableField fieldId="contact.linkedin" value={extras.links.linkedin.label} onChange={(v) => patchExtras({ links: { ...extras.links, linkedin: { ...extras.links.linkedin, label: v } } }, "debounce")} onBlur={onFlushHistory} onFocus={setActiveFieldId} format={getFieldFormat(extras, "contact.linkedin")} link={{ url: extras.links.linkedin.url, enabled: extras.links.linkedin.enabled }} style={{ color: accent }} />
                    <EditableField fieldId="contact.phone" value={resume.phone} onChange={(v) => updateResume(["phone"], v)} onBlur={onFlushHistory} onFocus={setActiveFieldId} format={getFieldFormat(extras, "contact.phone")} style={{ color: textColor }} />
                  </div>
                </div>
                {imageSrc ? (
                  <div className="relative shrink-0 overflow-hidden" style={{ width: layout.photoSize, height: layout.photoSize, borderRadius: `${design.photoBorderRadius}%` }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imageSrc} alt="" className="absolute max-w-none" style={{ width: `${extras.photo.scale * 100}%`, height: `${extras.photo.scale * 100}%`, left: `${extras.photo.posX}%`, top: `${extras.photo.posY}%`, transform: "translate(-50%, -50%)", objectFit: "cover" }} />
                  </div>
                ) : null}
              </div>
              <div
                className="flex min-h-0 flex-1 overflow-hidden"
                style={{ marginTop: scalePx(8, layout), gap: layout.columnGap }}
              >
                <div
                  className="flex min-h-0 flex-col overflow-hidden"
                  style={{
                    width: `${layout.leftColumnWidthPercent}%`,
                    justifyContent: colJustify,
                    gap: sectionGap,
                  }}
                >
                  {extras.sectionOrder.left.map((id, i) => renderSection(id, "left", i))}
                </div>
                <div
                  className="flex min-h-0 flex-col overflow-hidden"
                  style={{
                    width: `${layout.rightColumnWidthPercent}%`,
                    justifyContent: colJustify,
                    gap: sectionGap,
                  }}
                >
                  {extras.sectionOrder.right.map((id, i) => renderSection(id, "right", i))}
                </div>
              </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
function ExperienceBlock({
  exp,
  index,
  extras,
  accent,
  muted,
  roleSize,
  metaSize,
  bodySize,
  layout,
  updateResume,
  onFlushHistory,
  onFocus,
}: {
  exp: MasterResume["experience"][number];
  index: number;
  extras: ResumeEditorExtras;
  accent: string;
  muted: string;
  roleSize: number;
  metaSize: number;
  bodySize: number;
  layout: ResumeLayout;
  updateResume: (path: (string | number)[], value: unknown, mode?: SnapshotChangeMode) => void;
  onFlushHistory: () => void;
  onFocus: (id: string) => void;
}) {
  return (
    <div style={{ marginBottom: scalePx(6, layout) }}>
      <EditableField fieldId={`experience.${index}.role`} value={exp.role} onChange={(v) => updateResume(["experience", index, "role"], v)} onBlur={onFlushHistory} onFocus={onFocus} format={getFieldFormat(extras, `experience.${index}.role`)} style={{ fontWeight: 700, color: accent, fontSize: roleSize, display: "block" }} />
      <div className="flex justify-between gap-2" style={{ marginBottom: 2 }}>
        <EditableField fieldId={`experience.${index}.company`} value={exp.company} onChange={(v) => updateResume(["experience", index, "company"], v)} onBlur={onFlushHistory} onFocus={onFocus} format={getFieldFormat(extras, `experience.${index}.company`)} style={{ color: muted, fontSize: metaSize, flex: 1 }} />
        <span className="flex shrink-0 gap-1 text-right" style={{ fontSize: metaSize, color: muted, maxWidth: "48%" }}>
          <EditableField fieldId={`experience.${index}.dates`} value={exp.dates} onChange={(v) => updateResume(["experience", index, "dates"], v)} onBlur={onFlushHistory} onFocus={onFocus} />
          <EditableField fieldId={`experience.${index}.location`} value={exp.location} onChange={(v) => updateResume(["experience", index, "location"], v)} onBlur={onFlushHistory} onFocus={onFocus} />
        </span>
      </div>
      <ul>
        {exp.bullets.map((bullet, j) => {
          const fid = `experience.${index}.bullets.${j}`;
          const fmt = getFieldFormat(extras, fid);
          return (
            <li key={j} className="flex" style={{ marginBottom: scalePx(3, layout) }}>
              <span style={{ width: 8, fontSize: bodySize }}>{fmt.bullet === false ? "" : "•"}</span>
              <EditableField fieldId={fid} value={bullet} onChange={(v) => updateResume(["experience", index, "bullets", j], v)} onBlur={onFlushHistory} onFocus={onFocus} format={fmt} multiline style={{ flex: 1, color: muted, fontSize: bodySize, lineHeight: 1.32 }} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}

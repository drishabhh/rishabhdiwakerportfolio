"use client";

import type { FieldFormat, LinkField } from "@/lib/resume-editor-state";
import { FONT_OPTIONS } from "@/lib/field-format-style";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Italic,
  Link2,
  List,
  Square,
  Underline,
} from "lucide-react";

function TBtn({
  title,
  active,
  onClick,
  children,
}: {
  title: string;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`rounded px-1 py-0.5 ${active ? "bg-violet-600 text-white" : "bg-white text-zinc-700 hover:bg-zinc-100"}`}
    >
      {children}
    </button>
  );
}

function MiniColor({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: string;
  onChange: (v: string | undefined) => void;
}) {
  return (
    <label className="flex items-center gap-0.5 text-[9px] text-zinc-600" title={label}>
      {label}
      <input
        type="color"
        value={value || "#ffffff"}
        onChange={(e) => onChange(e.target.value)}
        className="h-4 w-5 cursor-pointer rounded border border-zinc-200 p-0"
      />
      {value ? (
        <button type="button" className="text-zinc-400 hover:text-zinc-600" onClick={() => onChange(undefined)}>
          ×
        </button>
      ) : null}
    </label>
  );
}

type Props = {
  fieldId: string;
  format: FieldFormat;
  linkField?: LinkField;
  linkConfig?: { url: string; enabled: boolean; label: string };
  onFormat: (patch: Partial<FieldFormat>) => void;
  onLink?: (patch: Partial<{ url: string; enabled: boolean; label: string }>) => void;
};

export function ResumeFormatToolbar({ fieldId, format, linkField, linkConfig, onFormat, onLink, inline }: Props & { inline?: boolean }) {
  const toolsRow = (
    <>
      <span className="mr-1 max-w-[100px] truncate text-[9px] font-medium text-violet-800">{fieldId}</span>
      <TBtn title="Bold" active={format.bold} onClick={() => onFormat({ bold: !format.bold })}>
        <Bold className="h-3 w-3" />
      </TBtn>
      <TBtn title="Italic" active={format.italic} onClick={() => onFormat({ italic: !format.italic })}>
        <Italic className="h-3 w-3" />
      </TBtn>
      <TBtn title="Underline" active={format.underline} onClick={() => onFormat({ underline: !format.underline })}>
        <Underline className="h-3 w-3" />
      </TBtn>
      <TBtn title="Bullet points" active={format.bullet} onClick={() => onFormat({ bullet: !format.bullet })}>
        <List className="h-3 w-3" />
      </TBtn>
      <TBtn title="Text box" active={format.textBox} onClick={() => onFormat({ textBox: !format.textBox })}>
        <Square className="h-3 w-3" />
      </TBtn>
      <span className="mx-0.5 h-3 w-px bg-zinc-200" />
      <TBtn title="Align left" active={format.align === "left"} onClick={() => onFormat({ align: format.align === "left" ? undefined : "left" })}>
        <AlignLeft className="h-3 w-3" />
      </TBtn>
      <TBtn title="Align center" active={format.align === "center"} onClick={() => onFormat({ align: format.align === "center" ? undefined : "center" })}>
        <AlignCenter className="h-3 w-3" />
      </TBtn>
      <TBtn title="Align right" active={format.align === "right"} onClick={() => onFormat({ align: format.align === "right" ? undefined : "right" })}>
        <AlignRight className="h-3 w-3" />
      </TBtn>
      <TBtn title="Justify" active={format.align === "justify"} onClick={() => onFormat({ align: format.align === "justify" ? undefined : "justify" })}>
        <AlignJustify className="h-3 w-3" />
      </TBtn>
      <select
        title="Font family"
        value={format.fontFamily ?? ""}
        onChange={(e) => onFormat({ fontFamily: e.target.value || undefined })}
        className="max-w-[88px] rounded border border-zinc-200 bg-white px-0.5 py-0 text-[9px]"
      >
        <option value="">Font</option>
        {FONT_OPTIONS.map((f) => (
          <option key={f.value} value={f.value}>
            {f.label}
          </option>
        ))}
      </select>
      <label className="flex items-center gap-0.5 text-[9px] text-zinc-600">
        Size
        <input
          type="number"
          min={6}
          max={28}
          step={0.5}
          value={format.fontSize ?? ""}
          placeholder="—"
          onChange={(e) => onFormat({ fontSize: e.target.value ? Number(e.target.value) : undefined })}
          className="w-8 rounded border border-zinc-200 px-0.5 py-0 text-[9px]"
        />
      </label>
      <MiniColor label="Color" value={format.fontColor} onChange={(v) => onFormat({ fontColor: v })} />
      <MiniColor label="Highlight" value={format.highlightColor} onChange={(v) => onFormat({ highlightColor: v })} />
      <MiniColor label="Shading" value={format.shading} onChange={(v) => onFormat({ shading: v })} />
      <label className="flex items-center gap-0.5 text-[9px] text-zinc-600">
        Line
        <input
          type="number"
          min={1}
          max={2.5}
          step={0.05}
          value={format.lineHeight ?? ""}
          placeholder="—"
          onChange={(e) => onFormat({ lineHeight: e.target.value ? Number(e.target.value) : undefined })}
          className="w-8 rounded border border-zinc-200 px-0.5 py-0 text-[9px]"
        />
      </label>
      <label className="flex items-center gap-0.5 text-[9px] text-zinc-600">
        Para
        <input
          type="number"
          min={0}
          max={24}
          step={1}
          value={format.paragraphSpacing ?? ""}
          placeholder="—"
          onChange={(e) => onFormat({ paragraphSpacing: e.target.value ? Number(e.target.value) : undefined })}
          className="w-8 rounded border border-zinc-200 px-0.5 py-0 text-[9px]"
        />
      </label>
      {linkField && linkConfig && onLink ? (
        <>
          <Link2 className="h-3 w-3 text-violet-600" />
          <label className="flex items-center gap-0.5 text-[9px]">
            <input type="checkbox" checked={linkConfig.enabled} onChange={(e) => onLink({ enabled: e.target.checked })} className="accent-violet-600" />
            Link
          </label>
          <input
            type="url"
            value={linkConfig.url}
            onChange={(e) => onLink({ url: e.target.value })}
            className="min-w-[80px] flex-1 rounded border border-zinc-200 px-1 py-0 text-[9px]"
          />
        </>
      ) : null}
    </>
  );

  if (inline) {
    return <div className="flex min-w-0 flex-1 flex-wrap items-center gap-0.5">{toolsRow}</div>;
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-0.5 border-t border-violet-100 pt-1">
      <div className="flex flex-wrap items-center gap-0.5">
        {toolsRow}
      </div>
    </div>
  );
}

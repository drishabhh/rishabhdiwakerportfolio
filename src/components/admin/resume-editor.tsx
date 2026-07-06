"use client";

import { ExternalLink, FileText, Link2, Upload } from "lucide-react";
import { useRef, useState } from "react";

export type ResumeEditorProps = {
  currentUrl?: string;
  downloadName: string;
  onDownloadNameChange: (name: string) => void;
  onUrlChange: (url: string) => void;
  uploading: boolean;
  error: string;
  onUpload: (file: File, downloadName: string) => Promise<void>;
};

export function ResumeEditor({
  currentUrl,
  downloadName,
  onDownloadNameChange,
  onUrlChange,
  uploading,
  error,
  onUpload,
}: ResumeEditorProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handlePick = () => inputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    await onUpload(selectedFile, downloadName);
    setSelectedFile(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <section className="space-y-5 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 sm:p-6">
      <div>
        <h2 className="text-lg font-semibold">Resume / CV</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Paste a Google Drive link (recommended on production) or upload a PDF for the download button on
          the site.
        </p>
      </div>

      <label className="block">
        <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">
          Google Drive or PDF link
        </span>
        <p className="mt-0.5 text-xs text-zinc-500">
          Share the file as &quot;Anyone with the link&quot;, then paste the link here and click Save changes.
        </p>
        <div className="relative mt-1.5">
          <Link2
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
            aria-hidden
          />
          <input
            type="url"
            value={currentUrl ?? ""}
            onChange={(e) => onUrlChange(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 py-2.5 pl-10 pr-3 text-base text-white placeholder:text-zinc-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500/50 sm:text-sm"
            placeholder="https://drive.google.com/file/d/…/view?usp=sharing"
          />
        </div>
      </label>

      {currentUrl ? (
        <div className="rounded-lg border border-zinc-700 bg-zinc-950/60 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Preview link</p>
          <a
            href={currentUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-2 break-all text-sm text-orange-300 hover:text-orange-200"
          >
            <ExternalLink size={14} className="shrink-0" />
            Open current resume link
          </a>
        </div>
      ) : (
        <p className="text-sm text-zinc-500">No resume link set yet.</p>
      )}

      <label className="block">
        <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">
          Download filename
        </span>
        <p className="mt-0.5 text-xs text-zinc-500">Name shown when visitors save the file (hosted PDFs only)</p>
        <input
          type="text"
          value={downloadName}
          onChange={(e) => onDownloadNameChange(e.target.value)}
          className="mt-1.5 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-base text-white placeholder:text-zinc-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500/50 sm:text-sm"
          placeholder="Rishabh-Diwaker-CV.pdf"
        />
      </label>

      <div className="rounded-lg border border-dashed border-zinc-700 px-4 py-3">
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Or upload a PDF</p>
        <p className="mt-1 text-xs text-zinc-500">Requires Vercel Blob or GitHub storage on the live site.</p>

        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={handleFileChange}
        />

        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={handlePick}
            disabled={uploading}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-600 px-4 py-2.5 text-sm text-zinc-200 hover:bg-zinc-800 disabled:opacity-50"
          >
            <FileText size={16} />
            {selectedFile ? selectedFile.name : "Choose PDF"}
          </button>
          <button
            type="button"
            onClick={handleUpload}
            disabled={uploading || !selectedFile}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-semibold hover:bg-orange-500 disabled:opacity-50"
          >
            <Upload size={16} />
            {uploading ? "Uploading…" : "Upload resume"}
          </button>
        </div>
        <p className="mt-2 text-xs text-zinc-500">PDF only · max 5 MB</p>
      </div>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}
    </section>
  );
}

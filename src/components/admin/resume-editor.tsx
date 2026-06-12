"use client";

import { ExternalLink, FileText, Upload } from "lucide-react";
import { useRef, useState } from "react";

export type ResumeEditorProps = {
  currentUrl?: string;
  downloadName: string;
  onDownloadNameChange: (name: string) => void;
  uploading: boolean;
  error: string;
  onUpload: (file: File, downloadName: string) => Promise<void>;
};

export function ResumeEditor({
  currentUrl,
  downloadName,
  onDownloadNameChange,
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
          Upload a PDF for the floating download button on the site (top-right on desktop).
        </p>
      </div>

      {currentUrl ? (
        <div className="rounded-lg border border-zinc-700 bg-zinc-950/60 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Current resume</p>
          <a
            href={currentUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-2 text-sm text-orange-300 hover:text-orange-200"
          >
            <ExternalLink size={14} />
            Open current PDF
          </a>
        </div>
      ) : (
        <p className="text-sm text-zinc-500">No resume uploaded yet.</p>
      )}

      <label className="block">
        <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">
          Download filename
        </span>
        <p className="mt-0.5 text-xs text-zinc-500">Name shown when visitors save the file</p>
        <input
          type="text"
          value={downloadName}
          onChange={(e) => onDownloadNameChange(e.target.value)}
          className="mt-1.5 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-base text-white placeholder:text-zinc-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500/50 sm:text-sm"
          placeholder="Rishabh-Diwaker-CV.pdf"
        />
      </label>

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
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

      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      <p className="text-xs text-zinc-500">PDF only · max 5 MB</p>
    </section>
  );
}

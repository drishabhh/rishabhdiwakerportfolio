"use client";

import { useCallback, useEffect, useState } from "react";
import { pdf } from "@react-pdf/renderer";
import {
  InteractiveResumeEditor,
  type SnapshotChangeMode,
} from "@/components/InteractiveResumeEditor";
import { ResumePDF } from "@/components/ResumePDF";
import { useUndoRedo } from "@/hooks/use-undo-redo";
import { masterResume, type MasterResume } from "@/lib/resumeData";
import type { ResumeReplacement } from "@/lib/gemini-resume";
import {
  A4_HEIGHT_PT,
  A4_WIDTH_PT,
  createEditorSnapshot,
  resolvePhotoSrc,
  getFieldFormat,
  mergeFieldFormat,
  type FieldFormat,
} from "@/lib/resume-editor-state";
import { preserveResumeSections } from "@/lib/resume-preserve";
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  Download,
  FileUp,
  Link2,
  Loader2,
  Sparkles,
  Wand2,
  Send,
  MessageSquare,
} from "lucide-react";
import Link from "next/link";

type Step = "upload" | "job" | "edit";

const STEPS: { id: Step; label: string }[] = [
  { id: "upload", label: "Upload resume" },
  { id: "job", label: "Job details" },
  { id: "edit", label: "Edit & export" },
];

function StepIndicator({ current }: { current: Step }) {
  const idx = STEPS.findIndex((s) => s.id === current);
  return (
    <ol className="flex flex-wrap items-center gap-2 sm:gap-3">
      {STEPS.map((s, i) => {
        const done = i < idx;
        const active = i === idx;
        return (
          <li key={s.id} className="flex items-center gap-2">
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold sm:h-8 sm:w-8 sm:text-sm ${
                active
                  ? "bg-violet-600 text-white shadow-md shadow-violet-600/30"
                  : done
                    ? "bg-violet-100 text-violet-700"
                    : "bg-zinc-100 text-zinc-400"
              }`}
            >
              {done ? "✓" : i + 1}
            </span>
            <span
              className={`hidden text-sm font-medium sm:inline ${
                active ? "text-zinc-900" : done ? "text-violet-700" : "text-zinc-400"
              }`}
            >
              {s.label}
            </span>
            {i < STEPS.length - 1 ? (
              <span className="mx-1 hidden h-px w-6 bg-zinc-200 sm:block md:w-10" />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      const base64 = result.includes(",") ? result.split(",")[1]! : result;
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("Could not read file."));
    reader.readAsDataURL(file);
  });
}

export default function ResumeBuilderPage() {
  const [step, setStep] = useState<Step>("upload");
  const [baseResume, setBaseResume] = useState<MasterResume | null>(null);
  const editorHistory = useUndoRedo(createEditorSnapshot(masterResume));
  const [companyName, setCompanyName] = useState("");
  const [jobUrl, setJobUrl] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [replacements, setReplacements] = useState<ResumeReplacement[]>([]);
  const [tailored, setTailored] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [aiReady, setAiReady] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchingJd, setFetchingJd] = useState(false);
  const [formError, setFormError] = useState("");
  const [uploadName, setUploadName] = useState("");
  const [hasEditor, setHasEditor] = useState(false);
  const [pageOverflow, setPageOverflow] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatSending, setChatSending] = useState(false);
  const [chatError, setChatError] = useState("");

  const handlePageOverflowChange = useCallback((overflow: boolean) => {
    setPageOverflow(overflow);
  }, []);

  useEffect(() => {
    void fetch("/api/status")
      .then((res) => res.json())
      .then((data: { ready?: boolean; message?: string }) => {
        setAiReady(Boolean(data.ready));
        setStatusMessage(data.message || "");
      })
      .catch(() => {
        setAiReady(false);
        setStatusMessage("Could not check AI configuration.");
      });
  }, []);

  const handleSnapshotChange = useCallback(
    (next: ReturnType<typeof createEditorSnapshot>, mode: SnapshotChangeMode) => {
      if (mode === "commit") editorHistory.commit(next);
      else if (mode === "debounce") editorHistory.commitDebounced(next);
      else editorHistory.replace(next);
    },
    [editorHistory],
  );

  function photoSrcForPdf(data: MasterResume) {
    if (!data.photoUrl) return undefined;
    if (data.photoUrl.startsWith("http") || data.photoUrl.startsWith("data:")) return data.photoUrl;
    return `${window.location.origin}${data.photoUrl}`;
  }

  async function handleUpload(file: File) {
    if (file.type !== "application/pdf") {
      setFormError("Please upload a PDF resume.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setFormError("PDF must be under 5 MB.");
      return;
    }

    setFormError("");
    setLoading(true);
    setUploadName(file.name);

    try {
      const pdfBase64 = await fileToBase64(file);
      const res = await fetch("/api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pdfBase64 }),
      });
      const data = (await res.json()) as { resume?: MasterResume; error?: string };
      if (!res.ok) {
        setFormError(data.error || "Could not parse resume.");
        return;
      }
      setBaseResume(data.resume!);
      setStep("job");
    } catch {
      setFormError("Upload failed. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleFetchJd() {
    const url = jobUrl.trim();
    if (!url) {
      setFormError("Paste a LinkedIn job URL first.");
      return;
    }

    setFormError("");
    setFetchingJd(true);

    try {
      const res = await fetch("/api/fetch-jd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = (await res.json()) as {
        text?: string;
        companyName?: string;
        warning?: string;
        error?: string;
      };
      if (!res.ok) {
        setFormError(data.error || "Could not extract job description.");
        return;
      }
      setJobDescription(data.text || "");
      if (data.companyName) setCompanyName(data.companyName);
      if (data.warning) setStatusMessage(data.warning);
      else setStatusMessage("Job description extracted.");
    } catch {
      setFormError("Could not extract job description. Paste it manually.");
    } finally {
      setFetchingJd(false);
    }
  }

  async function handleGenerate() {
    if (!baseResume) {
      setFormError("Upload your resume first.");
      setStep("upload");
      return;
    }

    const company = companyName.trim();
    const description = jobDescription.trim();

    if (!company) {
      setFormError("Enter the company name.");
      return;
    }
    if (!description) {
      setFormError("Paste the job description or fetch it from a LinkedIn URL.");
      return;
    }

    setFormError("");
    setLoading(true);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: company,
          jobDescription: description,
          baseResume,
        }),
      });
      const data = (await res.json()) as {
        resume?: MasterResume;
        replacements?: ResumeReplacement[];
        error?: string;
        tailored?: boolean;
        message?: string;
      };
      if (!res.ok) {
        setFormError(data.error || "Failed to generate.");
        return;
      }
      const merged = preserveResumeSections(baseResume, data.resume ?? baseResume);
      editorHistory.reset(createEditorSnapshot(merged));
      setHasEditor(true);
      setReplacements(data.replacements ?? []);
      setTailored(Boolean(data.tailored));
      setStatusMessage(data.message || "");
      setStep("edit");
    } catch {
      setFormError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  function resolveFieldIdsForPattern(pattern: string, resume: MasterResume): string[] {
    if (!pattern.includes("*")) return [pattern];

    if (pattern === "experience.*.company") {
      return resume.experience.map((_, i) => `experience.${i}.company`);
    }
    if (pattern === "experience.*.role") {
      return resume.experience.map((_, i) => `experience.${i}.role`);
    }
    if (pattern === "experience.*.bullets.*") {
      return resume.experience.flatMap((exp, i) =>
        exp.bullets.map((_, j) => `experience.${i}.bullets.${j}`),
      );
    }
    if (pattern === "education.*.school") {
      return resume.education.map((_, i) => `education.${i}.school`);
    }
    if (pattern === "education.*.degree") {
      return resume.education.map((_, i) => `education.${i}.degree`);
    }
    if (pattern === "certifications.*.title") {
      return resume.certifications.map((_, i) => `certifications.${i}.title`);
    }
    if (pattern === "keyAchievements.*") {
      return resume.keyAchievements.map((_, i) => `keyAchievements.${i}`);
    }
    return [];
  }

  function defaultFontSizeFor(fieldId: string): number {
    if (fieldId.endsWith(".role")) return 9;
    if (fieldId.endsWith(".company")) return 8;
    return 8;
  }

  async function handleChatSend() {
    const instruction = chatInput.trim();
    if (!instruction || chatSending) return;

    setChatError("");
    setChatSending(true);
    const nextMessages: ChatMessage[] = [...chatMessages, { role: "user", content: instruction }];
    setChatMessages(nextMessages);
    setChatInput("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName,
          jobDescription,
          resume: editorHistory.state.resume,
          instruction,
          history: nextMessages,
        }),
      });
      const data = (await res.json()) as {
        resume?: MasterResume;
        replacements?: ResumeReplacement[];
        message?: string;
        error?: string;
        fieldFormatPatches?: {
          targetPattern: string;
          format: Partial<FieldFormat>;
          fontSizeIsDelta?: boolean;
        }[];
      };
      if (!res.ok) {
        setChatError(data.error || "Couldn't apply that change.");
        setChatMessages((prev) => prev.slice(0, -1));
        return;
      }

      let nextSnapshot = editorHistory.state;

      if (data.resume) {
        const merged = preserveResumeSections(nextSnapshot.resume, data.resume);
        nextSnapshot = { ...nextSnapshot, resume: merged };
      }

      if (data.fieldFormatPatches?.length) {
        let nextExtras = nextSnapshot.extras;
        for (const patch of data.fieldFormatPatches) {
          for (const fieldId of resolveFieldIdsForPattern(patch.targetPattern, nextSnapshot.resume)) {
            const format = { ...patch.format };
            if (patch.fontSizeIsDelta && typeof format.fontSize === "number") {
              const current = getFieldFormat(nextExtras, fieldId).fontSize ?? defaultFontSizeFor(fieldId);
              format.fontSize = current + format.fontSize;
            }
            nextExtras = mergeFieldFormat(nextExtras, fieldId, format);
          }
        }
        nextSnapshot = { ...nextSnapshot, extras: nextExtras };
      }

      if (nextSnapshot !== editorHistory.state) {
        editorHistory.commit(nextSnapshot);
      }

      if (data.replacements?.length) {
        setReplacements((prev) => [...prev, ...data.replacements!]);
      }
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.message || "Done — updated your resume." },
      ]);
    } catch {
      setChatError("Something went wrong. Try again.");
      setChatMessages((prev) => prev.slice(0, -1));
    } finally {
      setChatSending(false);
    }
  }

  async function handleDownload() {
    if (pageOverflow) {
      const proceed = window.confirm(
        "Your resume content exceeds one A4 page and may be cut off in the PDF.\n\nDownload anyway?",
      );
      if (!proceed) return;
    }

    const snap = editorHistory.state;
    const blob = await pdf(
      <ResumePDF
        data={snap.resume}
        layout={snap.layout}
        extras={snap.extras}
        photoSrc={resolvePhotoSrc(snap, photoSrcForPdf(snap.resume))}
      />,
    ).toBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const safeName = (snap.resume.name || "Resume").replace(/\s+/g, "_");
    const safeCompany = companyName.replace(/\s+/g, "_") || "Tailored";
    a.download = `${safeName}_${safeCompany}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const btnPrimary =
    "inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-violet-600/25 transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60";
  const btnSecondary =
    "inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50";

  const pageWidth = step === "edit" ? "max-w-6xl" : "max-w-3xl";

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50/80 via-white to-zinc-50">
      <header className="border-b border-zinc-200/80 bg-white/80 backdrop-blur-md">
        <div className={`mx-auto flex items-center justify-between gap-4 px-4 py-4 sm:px-6 ${pageWidth}`}>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-600 text-white shadow-sm">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-base font-bold text-zinc-900 sm:text-lg">Resume Tailoring</h1>
              <p className="hidden text-xs text-zinc-500 sm:block">
                Upload → job description → A4 PDF export
              </p>
            </div>
          </div>
          {process.env.NEXT_PUBLIC_PORTFOLIO_URL ? (
            <Link
              href={process.env.NEXT_PUBLIC_PORTFOLIO_URL}
              className="text-xs font-medium text-zinc-500 transition hover:text-violet-600 sm:text-sm"
            >
              ← Portfolio
            </Link>
          ) : null}
        </div>
      </header>

      <main className={`mx-auto px-4 py-6 sm:px-6 sm:py-10 ${pageWidth}`}>
        <div className="mb-6 sm:mb-8">
          <StepIndicator current={step} />
        </div>

        {aiReady === false ? (
          <div className="mb-4 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <span className="shrink-0">⚠</span>
            <span>{statusMessage || "Add GEMINI_API_KEY, GROQ_API_KEY, and/or OPENROUTER_API_KEY to .env.local (see .env.example)."}</span>
          </div>
        ) : null}

        {aiReady ? (
          <div className="mb-4 flex gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>
              AI tailors lines to match the JD — Gemini first, then Groq, then OpenRouter. Fixed one-page A4 layout.
            </span>
          </div>
        ) : null}

        <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm shadow-zinc-200/50 sm:p-6 md:p-8">
          {step === "upload" && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-zinc-900 sm:text-xl">Upload your resume</h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Upload a PDF. We read your content and keep the same structure — jobs, bullets, and
                  sections stay intact on one A4 page.
                </p>
              </div>

              <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-violet-200 bg-violet-50/40 px-6 py-10 transition hover:border-violet-400 hover:bg-violet-50/70">
                <FileUp className="h-10 w-10 text-violet-600" />
                <div className="text-center">
                  <p className="text-sm font-semibold text-zinc-900">Drop PDF here or click to browse</p>
                  <p className="mt-1 text-xs text-zinc-500">Max 5 MB · text-based PDF recommended</p>
                </div>
                <input
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void handleUpload(f);
                  }}
                />
              </label>

              {uploadName ? (
                <p className="text-sm text-zinc-600">
                  Last file: <span className="font-medium">{uploadName}</span>
                </p>
              ) : null}

              {formError ? (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>
              ) : null}

              {loading ? (
                <div className="flex items-center gap-2 text-sm text-violet-700">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Reading your resume…
                </div>
              ) : null}
            </div>
          )}

          {step === "job" && baseResume && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-zinc-900 sm:text-xl">Target job</h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Paste a LinkedIn job link — AI extracts the description from the page.
                  Or type the JD manually.
                </p>
              </div>

              <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
                Resume loaded for <span className="font-semibold">{baseResume.name}</span>
                {baseResume.experience.length > 0 ? (
                  <span> · {baseResume.experience.length} roles</span>
                ) : null}
              </div>

              <div>
                <label className="block">
                  <span className="text-sm font-medium text-zinc-700">Job posting URL</span>
                  <input
                    value={jobUrl}
                    onChange={(e) => setJobUrl(e.target.value)}
                    placeholder="https://www.linkedin.com/jobs/view/…"
                    className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 py-3 text-zinc-900 placeholder:text-zinc-400 focus:border-violet-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                  />
                </label>
                <button
                  type="button"
                  disabled={fetchingJd || !jobUrl.trim()}
                  onClick={() => void handleFetchJd()}
                  className={`${btnSecondary} mt-2`}
                >
                  {fetchingJd ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                  {fetchingJd ? "Extracting…" : "Extract job description with AI"}
                </button>
              </div>

              <label className="block">
                <span className="text-sm font-medium text-zinc-700">Company name</span>
                <input
                  value={companyName}
                  onChange={(e) => {
                    setCompanyName(e.target.value);
                    if (formError) setFormError("");
                  }}
                  placeholder="e.g. Google, Netflix"
                  className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 py-3 text-zinc-900 placeholder:text-zinc-400 focus:border-violet-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-zinc-700">Job description</span>
                <textarea
                  value={jobDescription}
                  onChange={(e) => {
                    setJobDescription(e.target.value);
                    if (formError) setFormError("");
                  }}
                  rows={12}
                  placeholder="Paste the full job description here…"
                  className="mt-1.5 w-full resize-y rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 py-3 text-sm leading-relaxed text-zinc-900 placeholder:text-zinc-400 focus:border-violet-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 sm:text-base"
                />
              </label>

              {formError ? (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>
              ) : null}

              <div className="flex flex-col gap-3 sm:flex-row">
                <button type="button" onClick={() => setStep("upload")} className={btnSecondary}>
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </button>
                <button
                  type="button"
                  disabled={loading || aiReady === false}
                  onClick={() => void handleGenerate()}
                  className={btnPrimary}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                  {loading ? "Generating…" : "Generate tailored resume"}
                </button>
              </div>
            </div>
          )}

          {step === "edit" && hasEditor && (
            <div className="space-y-5">
              <div
                className={`rounded-xl border px-4 py-3 ${
                  tailored
                    ? "border-violet-200 bg-violet-50 text-violet-900"
                    : "border-zinc-200 bg-zinc-50 text-zinc-700"
                }`}
              >
                <p className="font-semibold">
                  {tailored ? `Tailored for ${companyName}` : "No changes needed"}
                </p>
                {statusMessage ? <p className="mt-1 text-sm opacity-90">{statusMessage}</p> : null}
              </div>

              {replacements.length > 0 ? (
                <details className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-4">
                  <summary className="cursor-pointer text-sm font-semibold text-zinc-900">
                    {replacements.length} line{replacements.length === 1 ? "" : "s"} updated (replace-only)
                  </summary>
                  <ul className="mt-3 space-y-3">
                    {replacements.map((item, i) => (
                      <li key={i} className="text-sm text-zinc-600">
                        <p className="font-medium text-zinc-800">{item.field}</p>
                        <p className="mt-0.5 text-xs text-violet-700">{item.reason}</p>
                        <p className="mt-1 line-through opacity-60">{item.original}</p>
                        <p className="mt-0.5 text-zinc-800">{item.replacement}</p>
                      </li>
                    ))}
                  </ul>
                </details>
              ) : null}

              <div className="rounded-xl border border-zinc-200 bg-white">
                <div className="flex items-center gap-2 border-b border-zinc-100 px-4 py-3">
                  <MessageSquare className="h-4 w-4 text-violet-600" />
                  <p className="text-sm font-semibold text-zinc-900">Ask AI to adjust this resume</p>
                </div>

                {chatMessages.length > 0 ? (
                  <div className="max-h-64 space-y-3 overflow-y-auto px-4 py-3">
                    {chatMessages.map((m, i) => (
                      <div
                        key={i}
                        className={`rounded-lg px-3 py-2 text-sm ${
                          m.role === "user"
                            ? "ml-auto max-w-[85%] bg-violet-600 text-white"
                            : "max-w-[85%] bg-zinc-100 text-zinc-800"
                        }`}
                      >
                        {m.content}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="px-4 py-3 text-sm text-zinc-500">
                    e.g. &quot;Make the summary shorter&quot; · &quot;Add more AI tools to skills&quot; ·
                    &quot;Tighten the bullets under AppsForBharat&quot;
                  </p>
                )}

                {chatError ? <p className="px-4 text-sm text-red-600">{chatError}</p> : null}

                <div className="flex items-center gap-2 border-t border-zinc-100 p-3">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void handleChatSend();
                      }
                    }}
                    placeholder="Tell the AI what to change…"
                    disabled={chatSending || aiReady === false}
                    className="flex-1 rounded-lg border border-zinc-200 bg-zinc-50/50 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-violet-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 disabled:opacity-60"
                  />
                  <button
                    type="button"
                    onClick={() => void handleChatSend()}
                    disabled={chatSending || !chatInput.trim() || aiReady === false}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-600 text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                  >
                    {chatSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-zinc-900">A4 preview & edit</h2>
                  <p className="mt-1 text-sm text-zinc-500">
                    Click text to edit · use toolbar for formatting · export is one-page A4 (
                    {A4_WIDTH_PT}×{A4_HEIGHT_PT}pt)
                  </p>
                  {pageOverflow ? (
                    <p className="mt-2 flex items-start gap-1.5 text-sm font-medium text-amber-800">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                      Content exceeds one page — shorten text before exporting.
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => void handleDownload()}
                  className={`${btnPrimary}${pageOverflow ? " ring-2 ring-amber-400 ring-offset-2" : ""}`}
                >
                  <Download className="h-4 w-4" />
                  Download A4 PDF
                </button>
              </div>

              <InteractiveResumeEditor
                snapshot={editorHistory.state}
                photoSrc={photoSrcForPdf(editorHistory.state.resume)}
                onSnapshotChange={handleSnapshotChange}
                onFlushHistory={editorHistory.flushDebounced}
                canUndo={editorHistory.canUndo}
                canRedo={editorHistory.canRedo}
                onUndo={editorHistory.undo}
                onRedo={editorHistory.redo}
                onPageOverflowChange={handlePageOverflowChange}
              />

              <div className="flex flex-col gap-3 sm:flex-row">
                <button type="button" onClick={() => setStep("job")} className={btnSecondary}>
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </button>
                <button type="button" onClick={() => void handleDownload()} className={btnPrimary}>
                  <Download className="h-4 w-4" />
                  Download A4 PDF
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

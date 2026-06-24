"use client";

import { FaviconEditor } from "@/components/admin/favicon-editor";
import { ResumeEditor } from "@/components/admin/resume-editor";
import type {
  ExperienceRole,
  HighlightItem,
  ServiceItem,
  SiteContent,
  SkillBlock,
  VaultPlaylist,
} from "@/lib/content-types";
import { originalHighlightItems } from "@/lib/original-highlights";
import { normalizeYouTubeHref, youtubeThumbnailFromUrl, youtubeVideoIdFromUrl } from "@/lib/youtube";
import { LogOut, Plus, RotateCcw, Save, Trash2, Undo2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type SectionId =
  | "header"
  | "hero"
  | "summary"
  | "highlights"
  | "skills"
  | "vault"
  | "experience"
  | "services"
  | "footer"
  | "resume"
  | "seo"
  | "tabIcon";

const sections: { id: SectionId; label: string }[] = [
  { id: "header", label: "Header" },
  { id: "hero", label: "Hero" },
  { id: "summary", label: "Summary" },
  { id: "highlights", label: "Highlights (Videos)" },
  { id: "skills", label: "Skills" },
  { id: "vault", label: "Archive / Vault" },
  { id: "experience", label: "Experience (Videos)" },
  { id: "services", label: "Services" },
  { id: "footer", label: "Footer & Contact" },
  { id: "resume", label: "Resume / CV" },
  { id: "tabIcon", label: "Tab Icon" },
  { id: "seo", label: "SEO" },
];

function HighlightVideoThumb({ href, className }: { href: string; className?: string }) {
  const thumb = youtubeThumbnailFromUrl(href);
  const videoId = youtubeVideoIdFromUrl(href);

  if (!thumb) {
    return (
      <div
        className={`flex shrink-0 items-center justify-center rounded-lg border border-dashed border-zinc-700 bg-zinc-900/80 text-[10px] text-zinc-500 ${className ?? "h-16 w-[4.5rem]"}`}
      >
        No preview
      </div>
    );
  }

  return (
    <img
      src={thumb}
      alt={videoId ? `Preview for ${videoId}` : "Video preview"}
      className={`shrink-0 rounded-lg border border-zinc-700 object-cover ${className ?? "h-16 w-[4.5rem]"}`}
    />
  );
}

function Field({
  label,
  value,
  onChange,
  multiline,
  hint,
  onBlur,
  onFocus,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  hint?: string;
  onBlur?: () => void;
  onFocus?: () => void;
}) {
  const inputClass =
    "mt-1.5 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-base text-white placeholder:text-zinc-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500/50 sm:text-sm";
  return (
    <label className="block">
      <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">{label}</span>
      {hint ? <p className="mt-0.5 text-xs text-zinc-500">{hint}</p> : null}
      {multiline ? (
        <textarea
          rows={4}
          className={inputClass}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          onFocus={onFocus}
        />
      ) : (
        <input
          type="text"
          className={inputClass}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          onFocus={onFocus}
        />
      )}
    </label>
  );
}

function parseCommaSeparated(value: string): string[] {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

/** Keeps raw text while focused so trailing commas/spaces are not stripped on each keystroke. */
function CommaSeparatedField({
  label,
  items,
  onChange,
  hint,
}: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  hint?: string;
}) {
  const [raw, setRaw] = useState(() => items.join(", "));
  const focusedRef = useRef(false);
  const itemsKey = items.join("\0");

  useEffect(() => {
    if (!focusedRef.current) {
      setRaw(items.join(", "));
    }
  }, [itemsKey, items]);

  const normalize = useCallback(() => {
    const parsed = parseCommaSeparated(raw);
    onChange(parsed);
    setRaw(parsed.join(", "));
  }, [raw, onChange]);

  return (
    <Field
      label={label}
      hint={hint}
      value={raw}
      onFocus={() => {
        focusedRef.current = true;
      }}
      onChange={(v) => {
        setRaw(v);
        onChange(parseCommaSeparated(v));
      }}
      onBlur={() => {
        focusedRef.current = false;
        normalize();
      }}
    />
  );
}

function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setLoading(false);
    if (res.ok) onSuccess();
    else setError("Wrong password. Try again.");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-xl sm:p-8"
      >
        <h1 className="text-xl font-bold text-white">Portfolio Admin</h1>
        <p className="mt-2 text-sm text-zinc-400">Sign in to edit videos and site text.</p>
        <label className="mt-6 block">
          <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">Password</span>
          <input
            type="password"
            autoFocus
            className="mt-1.5 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-white focus:border-orange-500 focus:outline-none"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}
        <button
          type="submit"
          disabled={loading || !password}
          className="mt-6 w-full rounded-lg bg-orange-600 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-500 disabled:opacity-50"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [content, setContent] = useState<SiteContent | null>(null);
  const [activeSection, setActiveSection] = useState<SectionId>("highlights");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const [iconError, setIconError] = useState("");
  const [uploadingResume, setUploadingResume] = useState(false);
  const [resumeError, setResumeError] = useState("");

  const loadSession = useCallback(async () => {
    const res = await fetch("/api/admin/session");
    const data = (await res.json()) as { authenticated: boolean };
    setAuthenticated(data.authenticated);
    if (data.authenticated) {
      const contentRes = await fetch("/api/content");
      setContent(await contentRes.json());
    }
  }, []);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const save = async () => {
    if (!content) return;
    (document.activeElement as HTMLElement | null)?.blur?.();
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    setSaving(true);
    setMessage("");
    const payload: SiteContent = {
      ...content,
      highlights: {
        items: content.highlights.items.map((item) => ({
          ...item,
          href: normalizeYouTubeHref(item.href),
        })),
      },
    };
    const res = await fetch("/api/content", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (res.ok) {
      setContent(payload);
      setMessage("Saved! Changes appear on the site within a few seconds.");
      setTimeout(() => setMessage(""), 4000);
    } else {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (res.status === 401) {
        setMessage("Session expired. Please log out and sign in again.");
      } else {
        setMessage(data.error || "Save failed. Please try again.");
      }
    }
  };

  const logout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    setAuthenticated(false);
    setContent(null);
  };

  const uploadFavicon = async (file: File) => {
    setUploadingIcon(true);
    setIconError("");
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/admin/favicon", { method: "POST", body: formData });
    setUploadingIcon(false);
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      setIconError(data.error || "Upload failed");
      return;
    }
    const data = (await res.json()) as { favicon: string };
    setContent((c) => (c ? { ...c, seo: { ...c.seo, favicon: data.favicon } } : c));
    setMessage("Tab icon saved! Hard-refresh the site tab to see it.");
    setTimeout(() => setMessage(""), 4000);
  };

  const uploadResume = async (file: File, downloadName: string) => {
    setUploadingResume(true);
    setResumeError("");
    const formData = new FormData();
    formData.append("file", file);
    formData.append("downloadName", downloadName);
    const res = await fetch("/api/admin/resume", { method: "POST", body: formData });
    setUploadingResume(false);
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      setResumeError(data.error || "Upload failed");
      return;
    }
    const data = (await res.json()) as { url: string; downloadName: string };
    setContent((c) =>
      c ? { ...c, resume: { url: data.url, downloadName: data.downloadName } } : c,
    );
    setMessage("Resume uploaded! The download button on the site is updated.");
    setTimeout(() => setMessage(""), 4000);
  };

  if (authenticated === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-400">
        Loading…
      </div>
    );
  }

  if (!authenticated) {
    return <LoginForm onSuccess={loadSession} />;
  }

  if (!content) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-400">
        Loading content…
      </div>
    );
  }

  const updateHighlight = (index: number, patch: Partial<HighlightItem>) => {
    setContent((c) => {
      if (!c) return c;
      const items = [...c.highlights.items];
      items[index] = { ...items[index]!, ...patch };
      return { ...c, highlights: { items } };
    });
  };

  const trashHighlights = content?.trash?.highlights ?? [];

  const deleteHighlight = (index: number) => {
    setContent((c) => {
      if (!c) return c;
      const removed = c.highlights.items[index];
      if (!removed) return c;
      return {
        ...c,
        highlights: { items: c.highlights.items.filter((_, j) => j !== index) },
        trash: {
          highlights: [...(c.trash?.highlights ?? []), removed],
        },
      };
    });
  };

  const restoreHighlightFromTrash = (index: number) => {
    setContent((c) => {
      if (!c) return c;
      const item = c.trash?.highlights[index];
      if (!item) return c;
      return {
        ...c,
        highlights: { items: [...c.highlights.items, item] },
        trash: {
          highlights: (c.trash?.highlights ?? []).filter((_, j) => j !== index),
        },
      };
    });
  };

  const permanentlyDeleteFromTrash = (index: number) => {
    setContent((c) => {
      if (!c) return c;
      return {
        ...c,
        trash: {
          highlights: (c.trash?.highlights ?? []).filter((_, j) => j !== index),
        },
      };
    });
  };

  const restoreAllOriginalHighlights = () => {
    setContent((c) => {
      if (!c) return c;
      const current = c.highlights.items;
      const originals = originalHighlightItems;
      const removed = current.filter(
        (item) => !originals.some((o) => o.href === item.href && o.title === item.title),
      );
      return {
        ...c,
        highlights: { items: originals.map((item) => ({ ...item })) },
        trash: {
          highlights: [...(c.trash?.highlights ?? []), ...removed],
        },
      };
    });
    setMessage("Original 6 highlight videos restored. Click Save changes to publish.");
    setTimeout(() => setMessage(""), 5000);
  };

  const restoreAllFromTrash = () => {
    setContent((c) => {
      if (!c) return c;
      const bin = c.trash?.highlights ?? [];
      if (bin.length === 0) return c;
      return {
        ...c,
        highlights: { items: [...c.highlights.items, ...bin] },
        trash: { highlights: [] },
      };
    });
  };

  const updateRole = (index: number, patch: Partial<ExperienceRole>) => {
    setContent((c) => {
      if (!c) return c;
      const roles = [...c.experience.roles];
      roles[index] = { ...roles[index]!, ...patch };
      return { ...c, experience: { ...c.experience, roles } };
    });
  };

  const updatePlaylist = (index: number, patch: Partial<VaultPlaylist>) => {
    setContent((c) => {
      if (!c) return c;
      const playlists = [...c.vault.playlists];
      playlists[index] = { ...playlists[index]!, ...patch };
      return { ...c, vault: { ...c.vault, playlists } };
    });
  };

  const updateSkillBlock = (index: number, patch: Partial<SkillBlock>) => {
    setContent((c) => {
      if (!c) return c;
      const blocks = [...c.skills.blocks];
      blocks[index] = { ...blocks[index]!, ...patch };
      return { ...c, skills: { ...c.skills, blocks } };
    });
  };

  const updateService = (index: number, patch: Partial<ServiceItem>) => {
    setContent((c) => {
      if (!c) return c;
      const items = [...c.services.items];
      items[index] = { ...items[index]!, ...patch };
      return { ...c, services: { ...c.services, items } };
    });
  };

  return (
    <div className="min-h-screen bg-zinc-950 pb-24 text-white sm:pb-8">
      <header className="sticky top-0 z-20 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4">
          <div className="min-w-0">
            <h1 className="truncate text-base font-bold sm:text-lg">Content Dashboard</h1>
            <p className="text-xs text-zinc-500">Edit YouTube links and text by section</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <a
              href="/"
              target="_blank"
              className="inline-flex flex-1 items-center justify-center rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-900 sm:flex-none sm:border-transparent sm:px-0 sm:py-0 sm:text-zinc-400 sm:hover:text-white"
            >
              View site ↗
            </a>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="hidden items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold hover:bg-orange-500 disabled:opacity-50 sm:inline-flex"
            >
              <Save size={16} />
              {saving ? "Saving…" : "Save changes"}
            </button>
            <button
              type="button"
              onClick={logout}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-400 hover:bg-zinc-900 hover:text-white sm:flex-none"
            >
              <LogOut size={16} />
              <span className="sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {message ? (
        <div
          className={`border-b px-4 py-3 text-sm sm:px-6 ${
            message.startsWith("Saved") || message.includes("Tab icon saved")
              ? "border-emerald-900/50 bg-emerald-950/40 text-emerald-300"
              : "border-red-900/50 bg-red-950/40 text-red-300"
          }`}
        >
          {message}
        </div>
      ) : null}

      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-5 md:flex-row md:gap-8 md:px-6 md:py-8">
        <nav className="hidden w-48 shrink-0 flex-col gap-1 md:flex">
          {sections.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setActiveSection(s.id)}
              className={`rounded-lg px-3 py-2 text-left text-sm transition ${
                activeSection === s.id
                  ? "bg-orange-600/20 font-medium text-orange-300"
                  : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
              }`}
            >
              {s.label}
            </button>
          ))}
        </nav>

        <div className="min-w-0 flex-1 space-y-5 sm:space-y-6">
          <label className="block md:hidden">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-zinc-400">
              Section
            </span>
            <select
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-3 text-base text-white sm:text-sm"
              value={activeSection}
              onChange={(e) => setActiveSection(e.target.value as SectionId)}
            >
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>

          {activeSection === "header" && (
            <section className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 sm:p-6">
              <h2 className="text-lg font-semibold">Header</h2>
              <Field label="Name" value={content.header.name} onChange={(v) => setContent({ ...content, header: { ...content.header, name: v } })} />
              <Field
                label="Tagline"
                value={content.header.tagline}
                onChange={(v) =>
                  setContent({
                    ...content,
                    header: { ...content.header, tagline: v },
                    footer: { ...content.footer, tagline: v },
                  })
                }
                hint="Shown under your name in the header and footer"
              />
              <Field label="Status badge" value={content.header.statusLabel} onChange={(v) => setContent({ ...content, header: { ...content.header, statusLabel: v } })} />
              <Field
                label="WhatsApp URL"
                value={content.header.whatsappUrl}
                onChange={(v) => setContent({ ...content, header: { ...content.header, whatsappUrl: v } })}
                hint="WhatsApp icon link in the top navigation"
              />
            </section>
          )}

          {activeSection === "hero" && (
            <section className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 sm:p-6">
              <h2 className="text-lg font-semibold">Hero tagline</h2>
              <Field label="Prefix" value={content.hero.linePrefix} onChange={(v) => setContent({ ...content, hero: { ...content.hero, linePrefix: v } })} />
              <CommaSeparatedField
                label="Rotating words (comma-separated)"
                items={content.hero.rotatingWords}
                onChange={(rotatingWords) =>
                  setContent({
                    ...content,
                    hero: { ...content.hero, rotatingWords },
                  })
                }
                hint="Words that cycle in the hero line"
              />
              <Field label="Suffix" value={content.hero.lineSuffix} onChange={(v) => setContent({ ...content, hero: { ...content.hero, lineSuffix: v } })} />
              <Field
                label="CTA button label"
                value={content.hero.cta?.label ?? ""}
                onChange={(v) =>
                  setContent({
                    ...content,
                    hero: {
                      ...content.hero,
                      cta: {
                        label: v,
                        href: content.hero.cta?.href ?? "",
                      },
                    },
                  })
                }
                hint="Home screen call-to-action button"
              />
              <Field
                label="CTA link (YouTube URL)"
                value={content.hero.cta?.href ?? ""}
                onChange={(v) =>
                  setContent({
                    ...content,
                    hero: {
                      ...content.hero,
                      cta: {
                        label: content.hero.cta?.label ?? "Watch showreel",
                        href: v,
                      },
                    },
                  })
                }
              />
            </section>
          )}

          {activeSection === "summary" && (
            <section className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 sm:p-6">
              <h2 className="text-lg font-semibold">Summary</h2>
              <Field label="Section title" value={content.summary.title} onChange={(v) => setContent({ ...content, summary: { ...content.summary, title: v } })} />
              <Field label="Professional profile" value={content.summary.professionalProfile} onChange={(v) => setContent({ ...content, summary: { ...content.summary, professionalProfile: v } })} multiline />
              <Field label="Core philosophy" value={content.summary.corePhilosophy} onChange={(v) => setContent({ ...content, summary: { ...content.summary, corePhilosophy: v } })} multiline />
            </section>
          )}

          {activeSection === "highlights" && (
            <section className="space-y-4">
              <div className="flex flex-col gap-3">
                <h2 className="text-base font-semibold sm:text-lg">Highlighted edits (YouTube videos)</h2>
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  <button
                    type="button"
                    onClick={() =>
                      setContent({
                        ...content,
                        highlights: {
                          items: [
                            { title: "New highlight", views: "0", caption: "", href: "", badge: "" },
                            ...content.highlights.items,
                          ],
                        },
                      })
                    }
                    className="inline-flex w-full items-center justify-center gap-1 rounded-lg border border-zinc-700 px-3 py-2.5 text-sm hover:bg-zinc-800 sm:w-auto sm:py-2"
                  >
                    <Plus size={14} /> Add video
                  </button>
                  <button
                    type="button"
                    onClick={restoreAllOriginalHighlights}
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-orange-700/60 bg-orange-950/30 px-3 py-2.5 text-sm text-orange-200 hover:bg-orange-950/50 sm:w-auto sm:py-2"
                  >
                    <RotateCcw size={14} /> Restore original 6 videos
                  </button>
                </div>
              </div>

              {content.highlights.items.map((item, i) => (
                <div key={`${item.href}-${i}`} className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <HighlightVideoThumb href={item.href} />
                      <div className="min-w-0 pt-0.5">
                        <p className="text-sm font-medium text-zinc-300">Video {i + 1}</p>
                        {item.title ? (
                          <p className="truncate text-xs text-zinc-500">{item.title}</p>
                        ) : (
                          <p className="text-xs text-zinc-600">No title yet</p>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteHighlight(i)}
                      className="inline-flex shrink-0 items-center gap-1 text-xs text-zinc-500 hover:text-red-400"
                      title="Move to trash"
                    >
                      <Trash2 size={16} />
                      <span className="hidden sm:inline">Move to trash</span>
                    </button>
                  </div>
                  <Field label="Title" value={item.title} onChange={(v) => updateHighlight(i, { title: v })} />
                  <Field
                    label="YouTube URL"
                    value={item.href}
                    onChange={(v) => updateHighlight(i, { href: v })}
                    onBlur={() => {
                      const normalized = normalizeYouTubeHref(item.href);
                      if (normalized !== item.href) updateHighlight(i, { href: normalized });
                    }}
                    hint="Paste any YouTube watch, Shorts, or youtu.be link"
                  />
                  {item.href.trim() ? (
                    youtubeVideoIdFromUrl(item.href) ? (
                      <p className="text-xs text-emerald-400">
                        Video ID: {youtubeVideoIdFromUrl(item.href)} — will play in gallery
                      </p>
                    ) : (
                      <p className="text-xs text-red-400">
                        Could not read a video ID from this URL. Use a direct watch, Shorts, or youtu.be link.
                      </p>
                    )
                  ) : null}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Views / metric" value={item.views} onChange={(v) => updateHighlight(i, { views: v })} />
                    <Field label="Badge (optional)" value={item.badge || ""} onChange={(v) => updateHighlight(i, { badge: v })} />
                  </div>
                  <Field label="Caption" value={item.caption || ""} onChange={(v) => updateHighlight(i, { caption: v })} />
                </div>
              ))}

              {trashHighlights.length > 0 ? (
                <div className="rounded-xl border border-dashed border-zinc-700 bg-zinc-950/60 p-4 sm:p-5">
                  <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                      <Trash2 size={16} className="text-zinc-500" />
                      <h3 className="text-sm font-semibold text-zinc-300">
                        Trash ({trashHighlights.length})
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={restoreAllFromTrash}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-zinc-600 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800 sm:py-1.5"
                    >
                      <Undo2 size={14} /> Restore all
                    </button>
                  </div>
                  <ul className="space-y-2">
                    {trashHighlights.map((item, i) => (
                      <li
                        key={`trash-${item.href}-${i}`}
                        className="flex flex-col gap-2 rounded-lg border border-zinc-800 bg-zinc-900/80 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <HighlightVideoThumb href={item.href} className="h-12 w-16" />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-zinc-200">{item.title || "Untitled"}</p>
                            <p className="truncate text-xs text-zinc-500">{item.href || "No URL"}</p>
                          </div>
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <button
                            type="button"
                            onClick={() => restoreHighlightFromTrash(i)}
                            className="inline-flex flex-1 items-center justify-center gap-1 rounded-md border border-emerald-800/60 bg-emerald-950/30 px-2.5 py-1.5 text-xs text-emerald-300 hover:bg-emerald-950/50 sm:flex-none"
                          >
                            <Undo2 size={12} /> Restore
                          </button>
                          <button
                            type="button"
                            onClick={() => permanentlyDeleteFromTrash(i)}
                            className="inline-flex flex-1 items-center justify-center gap-1 rounded-md border border-zinc-700 px-2.5 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-red-400 sm:flex-none"
                          >
                            <Trash2 size={12} /> Delete forever
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </section>
          )}

          {activeSection === "skills" && (
            <section className="space-y-4">
              <h2 className="text-lg font-semibold">Skills</h2>
              <Field label="Section title" value={content.skills.title} onChange={(v) => setContent({ ...content, skills: { ...content.skills, title: v } })} />
              <Field label="Subtitle" value={content.skills.subtitle} onChange={(v) => setContent({ ...content, skills: { ...content.skills, subtitle: v } })} multiline />
              {content.skills.blocks.map((block, i) => (
                <div key={block.num} className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 sm:p-5">
                  <Field label="Block number" value={block.num} onChange={(v) => updateSkillBlock(i, { num: v })} />
                  <Field label="Title" value={block.title} onChange={(v) => updateSkillBlock(i, { title: v })} />
                  <CommaSeparatedField
                    label="Tags (comma-separated)"
                    items={block.tags}
                    onChange={(tags) => updateSkillBlock(i, { tags })}
                  />
                </div>
              ))}
            </section>
          )}

          {activeSection === "vault" && (
            <section className="space-y-4">
              <h2 className="text-lg font-semibold">Production vault / Archive</h2>
              <Field label="Title" value={content.vault.title} onChange={(v) => setContent({ ...content, vault: { ...content.vault, title: v } })} />
              <Field label="Subtitle" value={content.vault.subtitle} onChange={(v) => setContent({ ...content, vault: { ...content.vault, subtitle: v } })} />
              {content.vault.playlists.map((pl, i) => (
                <div key={pl.id} className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 sm:p-5">
                  <span className="text-sm font-medium text-zinc-300">Playlist {i + 1}</span>
                  <Field label="Title" value={pl.title} onChange={(v) => updatePlaylist(i, { title: v })} />
                  <Field label="YouTube playlist URL" value={pl.href} onChange={(v) => updatePlaylist(i, { href: v })} />
                  <Field label="Description" value={pl.description} onChange={(v) => updatePlaylist(i, { description: v })} multiline />
                </div>
              ))}
            </section>
          )}

          {activeSection === "experience" && (
            <section className="space-y-4">
              <h2 className="text-lg font-semibold">Experience cards (YouTube reels)</h2>
              <Field label="Section title" value={content.experience.title} onChange={(v) => setContent({ ...content, experience: { ...content.experience, title: v } })} />
              {content.experience.roles.map((role, i) => (
                <div key={role.id} className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 sm:p-5">
                  <span className="text-sm font-medium text-zinc-300">{role.company}</span>
                  <Field label="Company" value={role.company} onChange={(v) => updateRole(i, { company: v })} />
                  <Field label="Date range" value={role.dateRange} onChange={(v) => updateRole(i, { dateRange: v })} />
                  <Field label="Role" value={role.role} onChange={(v) => updateRole(i, { role: v })} />
                  <Field label="Tagline" value={role.tagline} onChange={(v) => updateRole(i, { tagline: v })} />
                  <Field label="YouTube video URL" value={role.videoUrl} onChange={(v) => updateRole(i, { videoUrl: v })} hint="Plays when the card is opened" />
                </div>
              ))}
            </section>
          )}

          {activeSection === "services" && (
            <section className="space-y-4">
              <h2 className="text-lg font-semibold">Services</h2>
              <Field label="Section title" value={content.services.title} onChange={(v) => setContent({ ...content, services: { ...content.services, title: v } })} />
              {content.services.items.map((svc, i) => (
                <div key={svc.indexLabel} className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 sm:p-5">
                  <Field label="Index" value={svc.indexLabel} onChange={(v) => updateService(i, { indexLabel: v })} />
                  <Field label="Title" value={svc.title} onChange={(v) => updateService(i, { title: v })} />
                  <Field label="Description" value={svc.description} onChange={(v) => updateService(i, { description: v })} multiline />
                </div>
              ))}
            </section>
          )}

          {activeSection === "footer" && (
            <section className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 sm:p-6">
              <h2 className="text-lg font-semibold">Footer & contact</h2>
              <p className="text-xs text-zinc-500">
                Tagline is edited in the Header section and appears in both places.
              </p>
              <Field label="Name" value={content.footer.name} onChange={(v) => setContent({ ...content, footer: { ...content.footer, name: v } })} />
              <Field label="Status label" value={content.footer.statusLabel} onChange={(v) => setContent({ ...content, footer: { ...content.footer, statusLabel: v } })} />
              <Field label="Email" value={content.footer.email} onChange={(v) => setContent({ ...content, footer: { ...content.footer, email: v } })} />
              {content.footer.socials.map((social, i) => (
                <div key={i} className="grid gap-3 sm:grid-cols-2">
                  <Field
                    label={`Social ${i + 1} label`}
                    value={social.label}
                    onChange={(v) => {
                      const socials = [...content.footer.socials];
                      socials[i] = { ...socials[i]!, label: v };
                      setContent({ ...content, footer: { ...content.footer, socials } });
                    }}
                  />
                  <Field
                    label="URL"
                    value={social.href}
                    onChange={(v) => {
                      const socials = [...content.footer.socials];
                      socials[i] = { ...socials[i]!, href: v };
                      setContent({ ...content, footer: { ...content.footer, socials } });
                    }}
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  setContent({
                    ...content,
                    footer: { ...content.footer, socials: [...content.footer.socials, { label: "New", href: "" }] },
                  })
                }
                className="inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-white"
              >
                <Plus size={14} /> Add social link
              </button>
            </section>
          )}

          {activeSection === "resume" && (
            <ResumeEditor
              currentUrl={content.resume?.url || undefined}
              downloadName={content.resume?.downloadName ?? "Rishabh-Diwaker-CV.pdf"}
              onDownloadNameChange={(v) =>
                setContent({
                  ...content,
                  resume: {
                    url: content.resume?.url ?? "",
                    downloadName: v,
                  },
                })
              }
              uploading={uploadingResume}
              error={resumeError}
              onUpload={uploadResume}
            />
          )}

          {activeSection === "tabIcon" && (
            <FaviconEditor
              pageTitle={content.seo.title}
              currentFavicon={content.seo.favicon || undefined}
              uploading={uploadingIcon}
              error={iconError}
              onSave={uploadFavicon}
            />
          )}

          {activeSection === "seo" && (
            <section className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 sm:p-6">
              <h2 className="text-lg font-semibold">SEO / page metadata</h2>
              <Field label="Page title" value={content.seo.title} onChange={(v) => setContent({ ...content, seo: { ...content.seo, title: v } })} />
              <Field label="Meta description" value={content.seo.description} onChange={(v) => setContent({ ...content, seo: { ...content.seo, description: v } })} multiline />
            </section>
          )}
        </div>
      </div>

      {/* Mobile sticky save bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-zinc-800 bg-zinc-950/95 p-3 backdrop-blur sm:hidden">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-orange-600 py-3.5 text-sm font-semibold hover:bg-orange-500 disabled:opacity-50"
        >
          <Save size={18} />
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );
}

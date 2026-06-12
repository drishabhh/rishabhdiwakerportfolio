"use client";

import { FaviconEditor } from "@/components/admin/favicon-editor";
import type {
  ExperienceRole,
  HighlightItem,
  ServiceItem,
  SiteContent,
  SkillBlock,
  VaultPlaylist,
} from "@/lib/content";
import { LogOut, Plus, Save, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

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
  { id: "tabIcon", label: "Tab Icon" },
  { id: "seo", label: "SEO" },
];

function Field({
  label,
  value,
  onChange,
  multiline,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  hint?: string;
}) {
  const inputClass =
    "mt-1.5 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-base text-white placeholder:text-zinc-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500/50 sm:text-sm";
  return (
    <label className="block">
      <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">{label}</span>
      {hint ? <p className="mt-0.5 text-xs text-zinc-500">{hint}</p> : null}
      {multiline ? (
        <textarea rows={4} className={inputClass} value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input type="text" className={inputClass} value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </label>
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
    setSaving(true);
    setMessage("");
    const res = await fetch("/api/content", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(content),
    });
    setSaving(false);
    if (res.ok) {
      setMessage("Saved! Changes appear on the site within a few seconds.");
      setTimeout(() => setMessage(""), 4000);
    } else {
      setMessage("Save failed. Make sure you're still logged in.");
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
        <div className="border-b border-emerald-900/50 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-300 sm:px-6">
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
              <Field label="Tagline" value={content.header.tagline} onChange={(v) => setContent({ ...content, header: { ...content.header, tagline: v } })} />
              <Field label="Status badge" value={content.header.statusLabel} onChange={(v) => setContent({ ...content, header: { ...content.header, statusLabel: v } })} />
              <Field label="YouTube URL" value={content.header.youtubeUrl} onChange={(v) => setContent({ ...content, header: { ...content.header, youtubeUrl: v } })} hint="Link in the top navigation" />
            </section>
          )}

          {activeSection === "hero" && (
            <section className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 sm:p-6">
              <h2 className="text-lg font-semibold">Hero tagline</h2>
              <Field label="Prefix" value={content.hero.linePrefix} onChange={(v) => setContent({ ...content, hero: { ...content.hero, linePrefix: v } })} />
              <Field
                label="Rotating words (comma-separated)"
                value={content.hero.rotatingWords.join(", ")}
                onChange={(v) =>
                  setContent({
                    ...content,
                    hero: { ...content.hero, rotatingWords: v.split(",").map((w) => w.trim()).filter(Boolean) },
                  })
                }
                hint="Words that cycle in the hero line"
              />
              <Field label="Suffix" value={content.hero.lineSuffix} onChange={(v) => setContent({ ...content, hero: { ...content.hero, lineSuffix: v } })} />
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
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-base font-semibold sm:text-lg">Highlighted edits (YouTube videos)</h2>
                <button
                  type="button"
                  onClick={() =>
                    setContent({
                      ...content,
                      highlights: {
                        items: [
                          ...content.highlights.items,
                          { title: "New highlight", views: "0", caption: "", href: "", badge: "" },
                        ],
                      },
                    })
                  }
                  className="inline-flex w-full items-center justify-center gap-1 rounded-lg border border-zinc-700 px-3 py-2.5 text-sm hover:bg-zinc-800 sm:w-auto sm:py-1.5 sm:text-xs"
                >
                  <Plus size={14} /> Add video
                </button>
              </div>
              {content.highlights.items.map((item, i) => (
                <div key={i} className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 sm:p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-zinc-300">Video {i + 1}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setContent({
                          ...content,
                          highlights: { items: content.highlights.items.filter((_, j) => j !== i) },
                        })
                      }
                      className="text-zinc-500 hover:text-red-400"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <Field label="Title" value={item.title} onChange={(v) => updateHighlight(i, { title: v })} />
                  <Field label="YouTube URL" value={item.href} onChange={(v) => updateHighlight(i, { href: v })} hint="Paste any YouTube watch or youtu.be link" />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Views / metric" value={item.views} onChange={(v) => updateHighlight(i, { views: v })} />
                    <Field label="Badge (optional)" value={item.badge || ""} onChange={(v) => updateHighlight(i, { badge: v })} />
                  </div>
                  <Field label="Caption" value={item.caption || ""} onChange={(v) => updateHighlight(i, { caption: v })} />
                </div>
              ))}
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
                  <Field
                    label="Tags (comma-separated)"
                    value={block.tags.join(", ")}
                    onChange={(v) => updateSkillBlock(i, { tags: v.split(",").map((t) => t.trim()).filter(Boolean) })}
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
              <Field label="Name" value={content.footer.name} onChange={(v) => setContent({ ...content, footer: { ...content.footer, name: v } })} />
              <Field label="Tagline" value={content.footer.tagline} onChange={(v) => setContent({ ...content, footer: { ...content.footer, tagline: v } })} />
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

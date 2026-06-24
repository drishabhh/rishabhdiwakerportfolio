"use client";

import { useState } from "react";
import type { MasterResume } from "@/lib/resumeData";

const inputClass =
  "mt-1.5 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20";

function Field({
  label,
  value,
  onChange,
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className={inputClass}
        />
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} className={inputClass} />
      )}
    </label>
  );
}

export function TailoredResumeEditor({
  resume,
  onChange,
}: {
  resume: MasterResume;
  onChange: (resume: MasterResume) => void;
}) {
  const [tab, setTab] = useState<"summary" | "achievements" | "experience" | "skills" | "certs" | "education">(
    "summary",
  );

  const update = (path: (string | number)[], value: unknown) => {
    const next = structuredClone(resume) as MasterResume;
    let cur: Record<string, unknown> = next as unknown as Record<string, unknown>;
    for (let i = 0; i < path.length - 1; i++) {
      cur = cur[path[i]!] as Record<string, unknown>;
    }
    cur[path[path.length - 1]!] = value;
    onChange(next);
  };

  const TABS = [
    { id: "summary", label: "Summary" },
    { id: "achievements", label: "Achievements" },
    { id: "experience", label: "Experience" },
    { id: "skills", label: "Skills" },
    { id: "certs", label: "Certs" },
    { id: "education", label: "Education" },
  ] as const;

  const tabBtn = (active: boolean) =>
    `rounded-full px-3 py-1.5 text-xs font-medium transition sm:px-4 sm:text-sm ${
      active
        ? "bg-violet-600 text-white shadow-sm"
        : "border border-zinc-200 bg-white text-zinc-600 hover:border-violet-300 hover:text-violet-700"
    }`;

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50/50">
      <div className="flex flex-wrap gap-2 border-b border-zinc-200 bg-white p-3 sm:p-4">
        {TABS.map((t) => (
          <button key={t.id} type="button" onClick={() => setTab(t.id)} className={tabBtn(tab === t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="space-y-4 p-3 sm:p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" value={resume.name} onChange={(v) => update(["name"], v)} />
          <Field label="Title" value={resume.title} onChange={(v) => update(["title"], v)} />
          <Field label="Email" value={resume.email} onChange={(v) => update(["email"], v)} />
          <Field label="Phone" value={resume.phone} onChange={(v) => update(["phone"], v)} />
        </div>

        {tab === "summary" && (
          <Field label="Summary" value={resume.summary} multiline onChange={(v) => update(["summary"], v)} />
        )}

        {tab === "achievements" && (
          <div className="space-y-2">
            {resume.keyAchievements.map((a, i) => (
              <div key={i} className="flex gap-2">
                <textarea
                  value={a}
                  onChange={(e) => update(["keyAchievements", i], e.target.value)}
                  rows={2}
                  className={`${inputClass} mt-0 flex-1`}
                />
                <button
                  type="button"
                  onClick={() => update(["keyAchievements"], resume.keyAchievements.filter((_, j) => j !== i))}
                  className="shrink-0 rounded-lg border border-zinc-200 px-2 text-zinc-400 hover:border-red-200 hover:text-red-500"
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => update(["keyAchievements"], [...resume.keyAchievements, ""])}
              className="text-sm font-medium text-violet-600 hover:text-violet-700"
            >
              + Add achievement
            </button>
          </div>
        )}

        {tab === "experience" && (
          <div className="space-y-4">
            {resume.experience.map((exp, i) => (
              <div key={i} className="rounded-lg border border-zinc-200 bg-white p-3 sm:p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Role" value={exp.role} onChange={(v) => update(["experience", i, "role"], v)} />
                  <Field
                    label="Company"
                    value={exp.company}
                    onChange={(v) => update(["experience", i, "company"], v)}
                  />
                  <Field label="Dates" value={exp.dates} onChange={(v) => update(["experience", i, "dates"], v)} />
                  <Field
                    label="Location"
                    value={exp.location}
                    onChange={(v) => update(["experience", i, "location"], v)}
                  />
                </div>
                <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">Bullets</p>
                <div className="mt-2 space-y-2">
                  {exp.bullets.map((b, j) => (
                    <div key={j} className="flex gap-2">
                      <textarea
                        value={b}
                        onChange={(e) => update(["experience", i, "bullets", j], e.target.value)}
                        rows={2}
                        className={`${inputClass} mt-0 flex-1`}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          update(
                            ["experience", i, "bullets"],
                            exp.bullets.filter((_, k) => k !== j),
                          )
                        }
                        className="shrink-0 rounded-lg border border-zinc-200 px-2 text-zinc-400 hover:border-red-200 hover:text-red-500"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => update(["experience", i, "bullets"], [...exp.bullets, ""])}
                  className="mt-2 text-sm font-medium text-violet-600 hover:text-violet-700"
                >
                  + Add bullet
                </button>
              </div>
            ))}
          </div>
        )}

        {tab === "skills" && (
          <div className="space-y-4">
            {Object.entries(resume.skills).map(([group, items]) => (
              <div key={group} className="rounded-lg border border-zinc-200 bg-white p-3 sm:p-4">
                <p className="text-sm font-semibold text-violet-700">{group}</p>
                <div className="mt-2 space-y-2">
                  {items.map((s, si) => (
                    <div key={si} className="flex gap-2">
                      <input
                        value={s}
                        onChange={(e) => {
                          const next = structuredClone(resume) as MasterResume;
                          next.skills[group as keyof MasterResume["skills"]][si] = e.target.value;
                          onChange(next);
                        }}
                        className={`${inputClass} mt-0 flex-1`}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const next = structuredClone(resume) as MasterResume;
                          next.skills[group as keyof MasterResume["skills"]] = next.skills[
                            group as keyof MasterResume["skills"]
                          ].filter((_, k) => k !== si);
                          onChange(next);
                        }}
                        className="shrink-0 rounded-lg border border-zinc-200 px-2 text-zinc-400 hover:border-red-200 hover:text-red-500"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = structuredClone(resume) as MasterResume;
                    next.skills[group as keyof MasterResume["skills"]] = [
                      ...next.skills[group as keyof MasterResume["skills"]],
                      "",
                    ];
                    onChange(next);
                  }}
                  className="mt-2 text-sm font-medium text-violet-600 hover:text-violet-700"
                >
                  + Add skill
                </button>
              </div>
            ))}
          </div>
        )}

        {tab === "certs" && (
          <div className="space-y-4">
            {resume.certifications.map((c, i) => (
              <div key={i} className="rounded-lg border border-zinc-200 bg-white p-3 sm:p-4">
                <Field label="Title" value={c.title} onChange={(v) => update(["certifications", i, "title"], v)} />
                <Field
                  label="Detail"
                  value={c.detail}
                  multiline
                  onChange={(v) => update(["certifications", i, "detail"], v)}
                />
              </div>
            ))}
          </div>
        )}

        {tab === "education" && (
          <div className="space-y-3">
            {resume.education.map((e, i) => (
              <div key={i} className="grid gap-3 sm:grid-cols-3">
                <Field label="Degree" value={e.degree} onChange={(v) => update(["education", i, "degree"], v)} />
                <Field label="School" value={e.school} onChange={(v) => update(["education", i, "school"], v)} />
                <Field
                  label="Location"
                  value={e.location}
                  onChange={(v) => update(["education", i, "location"], v)}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

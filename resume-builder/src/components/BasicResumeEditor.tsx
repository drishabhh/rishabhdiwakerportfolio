"use client";

import type { MasterResume } from "@/lib/resumeData";

const inputClass =
  "mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20";

function Field({
  label,
  value,
  onChange,
  multiline = false,
  readOnly = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  readOnly?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-zinc-600">{label}</span>
      {multiline ? (
        <textarea
          value={value}
          readOnly={readOnly}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className={inputClass}
        />
      ) : (
        <input
          value={value}
          readOnly={readOnly}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
        />
      )}
    </label>
  );
}

export function BasicResumeEditor({
  resume,
  onChange,
}: {
  resume: MasterResume;
  onChange: (resume: MasterResume) => void;
}) {
  const update = (path: (string | number)[], value: unknown) => {
    const next = structuredClone(resume) as MasterResume;
    let cur: Record<string, unknown> = next as unknown as Record<string, unknown>;
    for (let i = 0; i < path.length - 1; i++) {
      cur = cur[path[i]!] as Record<string, unknown>;
    }
    cur[path[path.length - 1]!] = value;
    onChange(next);
  };

  const skillGroups = Object.entries(resume.skills);

  return (
    <div className="space-y-6">
      <p className="text-sm text-zinc-500">
        Edit wording only — sections and bullet counts stay fixed to match your uploaded resume.
      </p>

      <section className="space-y-3 rounded-xl border border-zinc-200 bg-zinc-50/50 p-4">
        <h3 className="text-sm font-semibold text-zinc-900">Header</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Name" value={resume.name} readOnly onChange={() => {}} />
          <Field label="Title" value={resume.title} onChange={(v) => update(["title"], v)} />
          <Field label="Email" value={resume.email} readOnly onChange={() => {}} />
          <Field label="Phone" value={resume.phone} readOnly onChange={() => {}} />
        </div>
      </section>

      <section className="space-y-3 rounded-xl border border-zinc-200 bg-zinc-50/50 p-4">
        <h3 className="text-sm font-semibold text-zinc-900">Summary</h3>
        <Field label="Summary" value={resume.summary} multiline onChange={(v) => update(["summary"], v)} />
      </section>

      {resume.keyAchievements.length > 0 ? (
        <section className="space-y-3 rounded-xl border border-zinc-200 bg-zinc-50/50 p-4">
          <h3 className="text-sm font-semibold text-zinc-900">Key achievements</h3>
          {resume.keyAchievements.map((item, i) => (
            <Field
              key={i}
              label={`Achievement ${i + 1}`}
              value={item}
              multiline
              onChange={(v) => update(["keyAchievements", i], v)}
            />
          ))}
        </section>
      ) : null}

      <section className="space-y-4 rounded-xl border border-zinc-200 bg-zinc-50/50 p-4">
        <h3 className="text-sm font-semibold text-zinc-900">Experience</h3>
        {resume.experience.map((exp, i) => (
          <div key={i} className="space-y-2 rounded-lg border border-zinc-200 bg-white p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">
              {exp.company || `Role ${i + 1}`}
            </p>
            <Field label="Role" value={exp.role} onChange={(v) => update(["experience", i, "role"], v)} />
            <div className="grid gap-2 sm:grid-cols-2">
              <Field label="Company" value={exp.company} readOnly onChange={() => {}} />
              <Field label="Dates" value={exp.dates} readOnly onChange={() => {}} />
            </div>
            {exp.bullets.map((bullet, j) => (
              <Field
                key={j}
                label={`Bullet ${j + 1}`}
                value={bullet}
                multiline
                onChange={(v) => update(["experience", i, "bullets", j], v)}
              />
            ))}
          </div>
        ))}
      </section>

      {skillGroups.length > 0 ? (
        <section className="space-y-4 rounded-xl border border-zinc-200 bg-zinc-50/50 p-4">
          <h3 className="text-sm font-semibold text-zinc-900">Skills</h3>
          {skillGroups.map(([group, items]) => (
            <div key={group} className="space-y-2">
              <p className="text-xs font-medium text-zinc-600">{group}</p>
              {items.map((skill, i) => (
                <Field
                  key={`${group}-${i}`}
                  label={`Skill ${i + 1}`}
                  value={skill}
                  onChange={(v) => update(["skills", group, i], v)}
                />
              ))}
            </div>
          ))}
        </section>
      ) : null}

      {resume.certifications.length > 0 ? (
        <section className="space-y-3 rounded-xl border border-zinc-200 bg-zinc-50/50 p-4">
          <h3 className="text-sm font-semibold text-zinc-900">Certifications</h3>
          {resume.certifications.map((cert, i) => (
            <div key={i} className="space-y-2 rounded-lg border border-zinc-200 bg-white p-3">
              <Field label="Title" value={cert.title} readOnly onChange={() => {}} />
              <Field
                label="Detail"
                value={cert.detail}
                multiline
                onChange={(v) => update(["certifications", i, "detail"], v)}
              />
            </div>
          ))}
        </section>
      ) : null}
    </div>
  );
}

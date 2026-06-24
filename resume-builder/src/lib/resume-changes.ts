import type { MasterResume } from "@/lib/resumeData";

export type ResumeChange = {
  section: string;
  change: string;
};

function sameText(a: string, b: string) {
  return a.trim() === b.trim();
}

function listDiff(before: string[], after: string[], section: string): ResumeChange[] {
  const changes: ResumeChange[] = [];
  if (before.length !== after.length) {
    changes.push({
      section,
      change:
        before.length > after.length
          ? `Trimmed from ${before.length} to ${after.length} items`
          : `Expanded from ${before.length} to ${after.length} items`,
    });
  }

  const beforeSet = new Set(before.map((s) => s.trim()));
  const afterSet = new Set(after.map((s) => s.trim()));
  const removed = before.filter((s) => !afterSet.has(s.trim()));
  const added = after.filter((s) => !beforeSet.has(s.trim()));

  if (removed.length > 0) {
    changes.push({
      section,
      change: `Removed ${removed.length} item${removed.length > 1 ? "s" : ""}`,
    });
  }
  if (added.length > 0) {
    changes.push({
      section,
      change: `Added ${added.length} item${added.length > 1 ? "s" : ""}`,
    });
  }

  const reordered =
    before.length === after.length &&
    before.some((item, i) => !sameText(item, after[i] ?? "")) &&
    removed.length === 0 &&
    added.length === 0;

  if (reordered) {
    changes.push({ section, change: "Reordered for relevance" });
  }

  return changes;
}

export function diffResumes(before: MasterResume, after: MasterResume): ResumeChange[] {
  const changes: ResumeChange[] = [];

  if (!sameText(before.title, after.title)) {
    changes.push({
      section: "Title",
      change: "Updated to match job focus",
    });
  }

  if (!sameText(before.summary, after.summary)) {
    changes.push({
      section: "Summary",
      change: "Reworded for this role",
    });
  }

  changes.push(...listDiff(before.keyAchievements, after.keyAchievements, "Key achievements"));

  const beforeExpOrder = before.experience.map((e) => `${e.role} @ ${e.company}`).join("|");
  const afterExpOrder = after.experience.map((e) => `${e.role} @ ${e.company}`).join("|");
  if (beforeExpOrder !== afterExpOrder) {
    changes.push({
      section: "Experience",
      change: "Roles reordered by relevance",
    });
  }

  for (let i = 0; i < Math.max(before.experience.length, after.experience.length); i++) {
    const b = before.experience[i];
    const a = after.experience[i];
    if (!b || !a) continue;
    const label = `${b.role} (${b.company})`;
    if (b.bullets.length !== a.bullets.length) {
      changes.push({
        section: "Experience",
        change: `${label}: bullets trimmed from ${b.bullets.length} to ${a.bullets.length}`,
      });
    } else if (b.bullets.some((bullet, j) => !sameText(bullet, a.bullets[j] ?? ""))) {
      changes.push({
        section: "Experience",
        change: `${label}: bullet wording updated`,
      });
    }
  }

  const beforeSkillGroups = Object.keys(before.skills);
  const afterSkillGroups = Object.keys(after.skills);
  if (beforeSkillGroups.join("|") !== afterSkillGroups.join("|")) {
    changes.push({
      section: "Skills",
      change: "Skill groups reordered",
    });
  }

  for (const group of new Set([...beforeSkillGroups, ...afterSkillGroups])) {
    const bItems = before.skills[group as keyof MasterResume["skills"]] ?? [];
    const aItems = after.skills[group as keyof MasterResume["skills"]] ?? [];
    if (bItems.join("|") !== aItems.join("|")) {
      changes.push({
        section: "Skills",
        change: `${group}: updated or reordered`,
      });
    }
  }

  if (changes.length === 0) {
    changes.push({
      section: "Resume",
      change: "No changes detected — output matches master resume",
    });
  }

  return changes;
}

export function resumesEqual(a: MasterResume, b: MasterResume) {
  return JSON.stringify(a) === JSON.stringify(b);
}

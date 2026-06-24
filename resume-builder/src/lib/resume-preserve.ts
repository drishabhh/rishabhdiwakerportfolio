import type { MasterResume } from "@/lib/resumeData";

type Certification = MasterResume["certifications"][number];
type Education = MasterResume["education"][number];

function isNonemptyCert(cert: Certification): boolean {
  return Boolean(cert.title.trim() || cert.detail.trim());
}

function isNonemptyEducation(edu: Education): boolean {
  return Boolean(edu.degree.trim() || edu.school.trim() || edu.location.trim());
}

export function filterNonemptyCertifications(certs: Certification[]): Certification[] {
  return certs.filter(isNonemptyCert);
}

export function filterNonemptyEducation(education: Education[]): Education[] {
  return education.filter(isNonemptyEducation);
}

function mergeCertification(tailored: Certification, base?: Certification): Certification {
  if (!base) return tailored;
  return {
    title: tailored.title.trim() || base.title,
    detail: tailored.detail.trim() || base.detail,
  };
}

function mergeEducation(tailored: Education, base?: Education): Education {
  if (!base) return tailored;
  return {
    degree: tailored.degree.trim() || base.degree,
    school: tailored.school.trim() || base.school,
    location: tailored.location.trim() || base.location,
  };
}

/** Keep certification and education from the uploaded resume when tailoring or parsing drops them. */
export function preserveResumeSections(base: MasterResume, tailored: MasterResume): MasterResume {
  const resume = structuredClone(tailored) as MasterResume;

  const baseCerts = filterNonemptyCertifications(base.certifications);
  const tailoredCerts = filterNonemptyCertifications(resume.certifications);

  if (tailoredCerts.length === 0 && baseCerts.length > 0) {
    resume.certifications = structuredClone(baseCerts);
  } else {
    const count = Math.max(tailoredCerts.length, baseCerts.length);
    resume.certifications = Array.from({ length: count }, (_, i) =>
      mergeCertification(resume.certifications[i] ?? { title: "", detail: "" }, baseCerts[i]),
    ).filter(isNonemptyCert);
    if (resume.certifications.length === 0 && baseCerts.length > 0) {
      resume.certifications = structuredClone(baseCerts);
    }
  }

  const baseEdu = filterNonemptyEducation(base.education);
  const tailoredEdu = filterNonemptyEducation(resume.education);

  if (tailoredEdu.length === 0 && baseEdu.length > 0) {
    resume.education = structuredClone(baseEdu);
  } else {
    const count = Math.max(tailoredEdu.length, baseEdu.length);
    resume.education = Array.from({ length: count }, (_, i) =>
      mergeEducation(resume.education[i] ?? { degree: "", school: "", location: "" }, baseEdu[i]),
    ).filter(isNonemptyEducation);
    if (resume.education.length === 0 && baseEdu.length > 0) {
      resume.education = structuredClone(baseEdu);
    }
  }

  return resume;
}

export function isProtectedTailorField(field: string): boolean {
  if (/^education(?:\[|\.)/.test(field)) return true;
  if (/^certifications\[\d+\]\.title$/.test(field)) return true;
  if (/^certifications\.\d+\.title$/.test(field)) return true;
  return false;
}

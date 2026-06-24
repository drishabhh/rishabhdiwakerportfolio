import { callAiChat } from "@/lib/ai-client";

export type JobDescriptionResult = {
  companyName: string;
  jobDescription: string;
  warning?: string;
};

const JD_SYSTEM_PROMPT = `You extract job posting details for resume tailoring.

RULES:
- ALWAYS return COMPANY and JOB DESCRIPTION sections. Never refuse. Never say you cannot access the page.
- Work with messy, partial, or noisy page text (navigation, ads, footers). Ignore junk; keep job content.
- Extract: job title, company, location, employment type, salary if present, about the role, responsibilities, requirements, qualifications, skills, nice-to-haves.
- If company name is unclear, infer from "X hiring Y" in the title or company links. Use UNKNOWN only as last resort.
- If bullets are incomplete, include every job-related sentence you find.
- Output plain text only in this exact format:

COMPANY:
[company name]

JOB DESCRIPTION:
[full extracted description — use bullets where appropriate]`;

function linkedInJobId(url: URL): string | null {
  const match = url.pathname.match(/\/jobs\/view\/(\d+)/);
  return match?.[1] ?? null;
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, "\n")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function extractTitleFromRaw(text: string): string {
  const titleLine =
    text.match(/^Title:\s*(.+)$/im)?.[1] ??
    text.match(/^#\s*(.+)$/m)?.[1] ??
    text.split("\n").find((l) => /hiring/i.test(l)) ??
    "";
  return titleLine.trim();
}

function extractCompanyFromText(text: string): string {
  const labeled =
    text.match(/(?:^|\n)\s*COMPANY:\s*\n?(.+?)(?:\n|$)/im)?.[1] ??
    text.match(/(?:^|\n)\s*(?:\*\*)?Company(?:\*\*)?:?\s*(.+?)(?:\n|$)/im)?.[1] ??
    text.match(/^([^|\n#]+?)\s+hiring\s+/im)?.[1] ??
    text.match(/role at \*\*([^*]+)\*\*/i)?.[1] ??
    text.match(/\*\*([^*]+)\*\*[^.\n]{0,80}(?:hiring|Bengaluru|Bangalore|India|Remote)/i)?.[1];

  return labeled?.replace(/\*\*/g, "").replace(/^UNKNOWN$/i, "").trim() ?? "";
}

function parseJdResponse(text: string): { companyName: string; jobDescription: string } {
  const cleaned = text.replace(/^\uFEFF/, "").replace(/```(?:json|text)?|```/g, "").trim();

  const companyMatch = cleaned.match(/^COMPANY:\s*\n?([\s\S]*?)(?:\nJOB DESCRIPTION:|\n---|\Z)/im);
  const jdMatch = cleaned.match(/JOB DESCRIPTION:\s*\n?([\s\S]+)$/im);
  if (jdMatch) {
    const companyName = (companyMatch?.[1] ?? "").trim().replace(/^UNKNOWN$/i, "");
    return { companyName, jobDescription: jdMatch[1]!.trim() };
  }

  const companyName = extractCompanyFromText(cleaned);
  return { companyName, jobDescription: cleaned };
}

function hasUsableJd(text: string): boolean {
  const { jobDescription } = parseJdResponse(text);
  if (jobDescription.length < 40) return false;

  const lower = jobDescription.toLowerCase();
  const refusalOnly =
    /^(i (?:am |'m )?sorry|i cannot|i can't|unable to access|could not access)/i.test(jobDescription.trim()) &&
    jobDescription.length < 200;

  return !refusalOnly;
}

async function fetchViaJina(url: string): Promise<string | null> {
  try {
    const res = await fetch(`https://r.jina.ai/${url}`, {
      headers: {
        Accept: "text/plain",
        "X-Return-Format": "text",
      },
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return null;
    const text = (await res.text()).trim();
    return text.length >= 80 ? text.slice(0, 32000) : null;
  } catch {
    return null;
  }
}

async function fetchViaDirect(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    const text = stripHtml(await res.text());
    return text.length >= 80 ? text.slice(0, 32000) : null;
  } catch {
    return null;
  }
}

async function fetchPageContent(url: string): Promise<{ text: string; source: string } | null> {
  const jina = await fetchViaJina(url);
  if (jina) return { text: jina, source: "jina" };

  const direct = await fetchViaDirect(url);
  if (direct) return { text: direct, source: "direct" };

  return null;
}

function buildExtractPrompt(jobUrl: string, pageText: string, titleHint: string, jobId: string | null): string {
  const idLine = jobId ? `LinkedIn job ID: ${jobId}\n` : "";
  const titleLine = titleHint ? `Page title hint: ${titleHint}\n` : "";

  return `${idLine}${titleLine}Job URL: ${jobUrl}

Below is raw text scraped from that job posting page (may include navigation noise). Extract ALL job-related content.

COMPANY:
[name]

JOB DESCRIPTION:
[title, location, salary, responsibilities, requirements, qualifications, skills]

--- PAGE TEXT START ---
${pageText.slice(0, 26000)}
--- PAGE TEXT END ---`;
}

function buildAggressivePrompt(jobUrl: string, pageText: string, titleHint: string): string {
  return `Job URL: ${jobUrl}
${titleHint ? `Title from page: ${titleHint}\n` : ""}
The page text below is messy. Extract every job-related line anyway. Combine fragments into a coherent job description. Do not apologize.

COMPANY:
[name from "Company hiring Role" patterns or links]

JOB DESCRIPTION:
[reconstructed JD]

Page text:
${pageText.slice(0, 18000)}`;
}

function buildMinimalPrompt(jobUrl: string, titleHint: string, snippet: string): string {
  return `Job URL: ${jobUrl}
${titleHint ? `Title: ${titleHint}\n` : ""}
Only this snippet was captured from the page. Expand into a usable job description using the title, URL, and any role/company hints in the text. Include typical sections (responsibilities, requirements) only if present in the snippet — do not invent employers or metrics.

COMPANY:
[name]

JOB DESCRIPTION:
[extracted content]

Snippet:
${snippet.slice(0, 8000)}`;
}

function finalizeResult(text: string, source: string): JobDescriptionResult {
  const { companyName, jobDescription } = parseJdResponse(text);

  if (!jobDescription || jobDescription.length < 40) {
    throw new Error("Could not extract enough job detail from that link.");
  }

  return {
    companyName,
    jobDescription: jobDescription.slice(0, 12000),
    warning: !companyName
      ? `Partial extract via ${source} — verify company name and add missing details.`
      : undefined,
  };
}

async function extractJdWithAi(prompt: string): Promise<{ text: string; provider: string }> {
  const { text, provider } = await callAiChat({
    prompt,
    system: JD_SYSTEM_PROMPT,
    temperature: 0.15,
    maxTokens: 4096,
  });
  return { text, provider };
}

export async function fetchJobDescription(url: string): Promise<JobDescriptionResult> {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error("Enter a valid http or https URL.");
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new Error("Enter a valid http or https URL.");
  }

  const jobUrl = parsedUrl.href;
  const jobId = linkedInJobId(parsedUrl);
  const page = await fetchPageContent(jobUrl);

  if (!page) {
    throw new Error(
      "Could not fetch that job page. Paste the job description manually, or try again in a moment.",
    );
  }

  const titleHint = extractTitleFromRaw(page.text);
  const attempts = [
    {
      name: page.source,
      prompt: buildExtractPrompt(jobUrl, page.text, titleHint, jobId),
    },
    {
      name: `${page.source}+aggressive`,
      prompt: buildAggressivePrompt(jobUrl, page.text, titleHint),
    },
    {
      name: `${page.source}+minimal`,
      prompt: buildMinimalPrompt(jobUrl, titleHint, page.text.slice(0, 12000)),
    },
  ];

  let lastRaw: string | null = null;

  for (const attempt of attempts) {
    try {
      const { text, provider } = await extractJdWithAi(attempt.prompt);
      lastRaw = text;
      if (hasUsableJd(text)) {
        return finalizeResult(text, `${provider} (${attempt.name})`);
      }
    } catch {
      // try next prompt
    }
  }

  if (lastRaw && lastRaw.length >= 40) {
    return finalizeResult(lastRaw, "best effort");
  }

  throw new Error(
    "Could not extract a job description from that link. Copy the posting text and paste it below.",
  );
}

/** @deprecated Use fetchJobDescription */
export const fetchJobDescriptionWithGemini = fetchJobDescription;

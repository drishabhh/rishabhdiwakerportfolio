const GEMINI_MODEL = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

export function getGeminiModel(): string {
  return GEMINI_MODEL;
}

export function getGeminiApiKey(): string | undefined {
  return process.env.GEMINI_API_KEY?.trim() || undefined;
}

export function isGeminiConfigured(): boolean {
  return Boolean(getGeminiApiKey());
}

type GeminiTools = Array<{ url_context?: Record<string, never> } | { google_search?: Record<string, never> }>;

async function geminiGenerate(input: {
  parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }>;
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
  tools?: GeminiTools;
}): Promise<string> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set.");
  }

  const generationConfig: Record<string, unknown> = {
    temperature: input.temperature ?? 0.2,
    maxOutputTokens: input.maxTokens ?? 8192,
  };
  if (input.jsonMode) {
    generationConfig.responseMimeType = "application/json";
  }

  const body: Record<string, unknown> = {
    contents: [{ parts: input.parts }],
    generationConfig,
  };
  if (input.tools?.length) body.tools = input.tools;

  const res = await fetch(
    `${GEMINI_BASE}/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );

  const payload = (await res.json()) as {
    error?: { message?: string; code?: number; status?: string };
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };

  if (!res.ok) {
    const message = payload.error?.message || `Gemini API failed (${res.status})`;
    const err = new Error(message) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }

  const text = payload.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) {
    throw new Error("Gemini returned an empty response");
  }

  return text;
}

export async function callGeminiChat(input: {
  prompt: string;
  system?: string;
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
  tools?: GeminiTools;
}): Promise<string> {
  const prompt = input.system ? `${input.system}\n\n${input.prompt}` : input.prompt;
  return geminiGenerate({
    parts: [{ text: prompt }],
    temperature: input.temperature,
    maxTokens: input.maxTokens,
    jsonMode: input.jsonMode,
    tools: input.tools,
  });
}

export async function callGeminiWithPdf(input: {
  pdfBase64: string;
  prompt: string;
  jsonMode?: boolean;
}): Promise<string> {
  return geminiGenerate({
    parts: [
      { inlineData: { mimeType: "application/pdf", data: input.pdfBase64 } },
      { text: input.prompt },
    ],
    temperature: 0.1,
    jsonMode: input.jsonMode,
  });
}

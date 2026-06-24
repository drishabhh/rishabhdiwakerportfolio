const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "google/gemini-2.5-flash";

export function getOpenRouterModel(): string {
  return process.env.OPENROUTER_MODEL?.trim() || DEFAULT_MODEL;
}

export function getOpenRouterApiKey(): string {
  const key = process.env.OPENROUTER_API_KEY?.trim();
  if (!key) {
    throw new Error(
      "OPENROUTER_API_KEY is not set. Add your key from openrouter.ai to .env.local and restart the dev server.",
    );
  }
  return key;
}

export function isOpenRouterConfigured(): boolean {
  return Boolean(process.env.OPENROUTER_API_KEY?.trim());
}

export async function callOpenRouterChat(input: {
  prompt: string;
  system?: string;
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
}): Promise<string> {
  const apiKey = getOpenRouterApiKey();
  const messages: Array<{ role: "system" | "user"; content: string }> = [];
  if (input.system) messages.push({ role: "system", content: input.system });
  messages.push({ role: "user", content: input.prompt });

  const body: Record<string, unknown> = {
    model: getOpenRouterModel(),
    messages,
    temperature: input.temperature ?? 0.2,
    max_tokens: input.maxTokens ?? 8192,
  };

  if (input.jsonMode) {
    body.response_format = { type: "json_object" };
  }

  const siteUrl = process.env.OPENROUTER_SITE_URL?.trim() || process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const siteName = process.env.OPENROUTER_SITE_NAME?.trim() || "Resume Builder";

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };
  if (siteUrl) headers["HTTP-Referer"] = siteUrl;
  if (siteName) headers["X-Title"] = siteName;

  const res = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  const payload = (await res.json()) as {
    error?: { message?: string };
    choices?: Array<{ message?: { content?: string | null } }>;
  };

  if (!res.ok) {
    throw new Error(payload.error?.message || `OpenRouter API failed (${res.status})`);
  }

  const text = payload.choices?.[0]?.message?.content?.trim();
  if (!text) {
    throw new Error("OpenRouter returned an empty response");
  }

  return text;
}

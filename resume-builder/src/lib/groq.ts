const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL = "llama-3.3-70b-versatile";

export function getGroqModel(): string {
  return process.env.GROQ_MODEL?.trim() || DEFAULT_MODEL;
}

export function getGroqApiKey(): string {
  const key = process.env.GROQ_API_KEY?.trim();
  if (!key) {
    throw new Error(
      "GROQ_API_KEY is not set. Add your key from console.groq.com to .env.local and restart the dev server.",
    );
  }
  return key;
}

export function isGroqConfigured(): boolean {
  return Boolean(process.env.GROQ_API_KEY?.trim());
}

export async function callGroqChat(input: {
  prompt: string;
  system?: string;
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
}): Promise<string> {
  const apiKey = getGroqApiKey();
  const messages: Array<{ role: "system" | "user"; content: string }> = [];
  if (input.system) messages.push({ role: "system", content: input.system });
  messages.push({ role: "user", content: input.prompt });

  const body: Record<string, unknown> = {
    model: getGroqModel(),
    messages,
    temperature: input.temperature ?? 0.2,
    max_tokens: input.maxTokens ?? 8192,
  };

  if (input.jsonMode) {
    body.response_format = { type: "json_object" };
  }

  const res = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  const payload = (await res.json()) as {
    error?: { message?: string };
    choices?: Array<{ message?: { content?: string | null } }>;
  };

  if (!res.ok) {
    throw new Error(payload.error?.message || `Groq API failed (${res.status})`);
  }

  const text = payload.choices?.[0]?.message?.content?.trim();
  if (!text) {
    throw new Error("Groq returned an empty response");
  }

  return text;
}

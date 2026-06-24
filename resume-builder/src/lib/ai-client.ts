import { callGeminiChat, callGeminiWithPdf, isGeminiConfigured } from "@/lib/gemini";
import { callGroqChat, isGroqConfigured } from "@/lib/groq";
import { callOpenRouterChat, isOpenRouterConfigured } from "@/lib/openrouter";

export type AiProvider = "gemini" | "groq" | "openrouter";

export function isAiConfigured(): boolean {
  return isGeminiConfigured() || isGroqConfigured() || isOpenRouterConfigured();
}

export function isRateLimitError(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  const status = (error as { status?: number })?.status;

  if (status === 429 || status === 503) return true;

  return (
    /quota|rate limit|resource exhausted|high demand|overloaded|too many requests|capacity|limit reached|exceeded/.test(
      message,
    )
  );
}

type ChatInput = {
  prompt: string;
  system?: string;
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
};

type ChatResult = { text: string; provider: AiProvider };

async function tryGeminiChat(input: ChatInput): Promise<ChatResult> {
  const text = await callGeminiChat(input);
  return { text, provider: "gemini" };
}

async function tryGroqChat(input: ChatInput): Promise<ChatResult> {
  const text = await callGroqChat(input);
  return { text, provider: "groq" };
}

async function tryOpenRouterChat(input: ChatInput): Promise<ChatResult> {
  const text = await callOpenRouterChat(input);
  return { text, provider: "openrouter" };
}

function noProviderError(): Error {
  return new Error(
    "No AI provider available. Add GEMINI_API_KEY, GROQ_API_KEY, and/or OPENROUTER_API_KEY to .env.local and restart the dev server.",
  );
}

/**
 * Gemini → Groq → OpenRouter. Each provider is tried only when configured.
 */
export async function callAiChat(input: ChatInput): Promise<ChatResult> {
  const attempts: Array<() => Promise<ChatResult>> = [];

  if (isGeminiConfigured()) attempts.push(() => tryGeminiChat(input));
  if (isGroqConfigured()) attempts.push(() => tryGroqChat(input));
  if (isOpenRouterConfigured()) attempts.push(() => tryOpenRouterChat(input));

  if (attempts.length === 0) throw noProviderError();

  let lastError: unknown;
  for (const attempt of attempts) {
    try {
      return await attempt();
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

type GeminiTools = Parameters<typeof callGeminiChat>[0]["tools"];

/**
 * Gemini with tools first; then callAiChat fallback chain on failure.
 */
export async function callAiChatWithTools(
  input: ChatInput & { tools?: GeminiTools },
): Promise<ChatResult> {
  if (isGeminiConfigured() && input.tools?.length) {
    try {
      const text = await callGeminiChat(input);
      return { text, provider: "gemini" };
    } catch {
      // fall through to callAiChat chain
    }
  }

  const { tools: _tools, ...rest } = input;
  return callAiChat(rest);
}

/**
 * Parse PDF: Gemini native PDF first, then extracted text + callAiChat (Gemini → Groq → OpenRouter).
 */
export async function parsePdfWithAi(input: {
  pdfBase64: string;
  prompt: string;
  jsonMode?: boolean;
  extractTextFallback: () => Promise<string>;
}): Promise<ChatResult> {
  if (isGeminiConfigured()) {
    try {
      const text = await callGeminiWithPdf({
        pdfBase64: input.pdfBase64,
        prompt: input.prompt,
        jsonMode: input.jsonMode,
      });
      return { text, provider: "gemini" };
    } catch {
      // Fall through to text extraction + callAiChat
    }
  }

  const pdfText = await input.extractTextFallback();
  if (!pdfText.trim()) {
    throw new Error("Could not read text from this PDF. Try a text-based PDF export.");
  }

  return callAiChat({
    prompt: `${input.prompt}\n\nResume text:\n"""\n${pdfText}\n"""`,
    jsonMode: input.jsonMode,
    temperature: 0.1,
    system: "You extract resume data into JSON. Copy text exactly — never invent or omit entries.",
  });
}

import { isAiConfigured } from "@/lib/ai-client";
import { isGeminiConfigured } from "@/lib/gemini";
import { isGroqConfigured } from "@/lib/groq";
import { isOpenRouterConfigured } from "@/lib/openrouter";
import { NextResponse } from "next/server";

export async function GET() {
  const geminiConfigured = isGeminiConfigured();
  const groqConfigured = isGroqConfigured();
  const openRouterConfigured = isOpenRouterConfigured();
  const ready = isAiConfigured();

  const configured = [
    geminiConfigured && "Gemini",
    groqConfigured && "Groq",
    openRouterConfigured && "OpenRouter",
  ].filter(Boolean) as string[];

  let message = "Add GEMINI_API_KEY, GROQ_API_KEY, and/or OPENROUTER_API_KEY to .env.local (see .env.example).";
  if (configured.length > 0) {
    message =
      configured.length === 1
        ? `${configured[0]} is ready.`
        : `${configured.join(" → ")} fallback chain is ready (Gemini first, then Groq, then OpenRouter).`;
  }

  return NextResponse.json({
    ready,
    geminiConfigured,
    groqConfigured,
    openRouterConfigured,
    message,
  });
}

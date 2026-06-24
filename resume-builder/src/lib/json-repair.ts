export function repairJson(text: string): string {
  let s = text.replace(/^\uFEFF/, "").replace(/```json|```/g, "").trim();
  s = s.replace(/,\s*([\]}])/g, "$1");
  s = s.replace(/\r\n/g, "\n");
  return s;
}

function closeTruncatedJson(text: string): string {
  const start = text.indexOf("{");
  if (start < 0) return text;

  let s = text.slice(start);
  s = s.replace(/,\s*"[^"]*":\s*"[^"]*$/, "");
  s = s.replace(/,\s*\{[^}]*$/, "");
  s = s.replace(/,\s*$/, "");

  const stack: string[] = [];
  let inString = false;
  let escaped = false;

  for (const ch of s) {
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{") stack.push("}");
    else if (ch === "[") stack.push("]");
    else if (ch === "}" || ch === "]") stack.pop();
  }

  if (inString) s += '"';
  while (stack.length > 0) s += stack.pop();
  return s;
}

export function extractJson(text: string): unknown {
  const attempts = [text, repairJson(text), closeTruncatedJson(repairJson(text))];

  for (const candidate of attempts) {
    const cleaned = candidate.trim();
    try {
      return JSON.parse(cleaned);
    } catch {
      const start = cleaned.indexOf("{");
      const end = cleaned.lastIndexOf("}");
      if (start >= 0 && end > start) {
        try {
          return JSON.parse(cleaned.slice(start, end + 1));
        } catch {
          try {
            return JSON.parse(closeTruncatedJson(cleaned.slice(start, end + 1)));
          } catch {
            // try next attempt
          }
        }
      }
    }
  }

  throw new Error("AI returned invalid JSON. Try again with a shorter job description.");
}

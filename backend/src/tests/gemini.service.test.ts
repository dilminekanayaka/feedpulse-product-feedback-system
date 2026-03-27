import { normalizeGeminiAnalysis, extractJsonBlock } from "../services/gemini.service";

describe("gemini.service helpers", () => {
  it("normalizes invalid values safely", () => {
    const result = normalizeGeminiAnalysis({
      category: "Unknown",
      sentiment: "Whatever",
      priority_score: 99,
      summary: "  user wants dark mode  ",
      tags: [" ui ", 123, " accessibility "],
    });

    expect(result).toEqual({
      category: "Other",
      sentiment: "Neutral",
      priority_score: 5,
      summary: "user wants dark mode",
      tags: ["ui", "accessibility"],
    });
  });

  it("extracts json from fenced markdown", () => {
    const result = extractJsonBlock('```json\n{"hello":"world"}\n```');
    expect(result).toBe('{"hello":"world"}');
  });
});

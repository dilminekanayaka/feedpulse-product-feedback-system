import { GoogleGenAI } from "@google/genai";

import { env } from "../config/env";
import {
  feedbackCategoryValues,
  feedbackSentimentValues,
} from "../models/feedback.model";

const ai = new GoogleGenAI({ apiKey: env.geminiApiKey });
const allowedCategories = new Set<string>(feedbackCategoryValues);
const allowedSentiments = new Set<string>(feedbackSentimentValues);
const geminiModel = "gemini-3-flash-preview";

type GeminiFeedbackAnalysis = {
  category: string;
  sentiment: string;
  priority_score: number;
  summary: string;
  tags: string[];
};

type GeminiThemeSummary = {
  summary: string;
  themes: string[];
};

function extractJsonBlock(rawText: string) {
  const trimmed = rawText.trim();

  if (trimmed.startsWith("```")) {
    const withoutFenceHeader = trimmed.replace(/^```(?:json)?\s*/i, "");
    return withoutFenceHeader.replace(/\s*```$/, "").trim();
  }

  return trimmed;
}

function normalizeGeminiAnalysis(input: unknown): GeminiFeedbackAnalysis {
  if (!input || typeof input !== "object") {
    throw new Error("Gemini response is not a valid object.");
  }

  const candidate = input as Record<string, unknown>;
  const category = typeof candidate.category === "string" ? candidate.category.trim() : "Other";
  const sentiment =
    typeof candidate.sentiment === "string" ? candidate.sentiment.trim() : "Neutral";
  const priorityScore =
    typeof candidate.priority_score === "number"
      ? candidate.priority_score
      : Number(candidate.priority_score);
  const summary = typeof candidate.summary === "string" ? candidate.summary.trim() : "";
  const tags = Array.isArray(candidate.tags)
    ? candidate.tags.filter((tag): tag is string => typeof tag === "string").map((tag) => tag.trim())
    : [];

  return {
    category: allowedCategories.has(category) ? category : "Other",
    sentiment: allowedSentiments.has(sentiment) ? sentiment : "Neutral",
    priority_score:
      Number.isFinite(priorityScore) && priorityScore >= 1 && priorityScore <= 10
        ? Math.round(priorityScore)
        : 5,
    summary,
    tags,
  };
}

function normalizeThemeSummary(input: unknown): GeminiThemeSummary {
  if (!input || typeof input !== "object") {
    throw new Error("Gemini summary response is not a valid object.");
  }

  const candidate = input as Record<string, unknown>;
  const summary = typeof candidate.summary === "string" ? candidate.summary.trim() : "";
  const themes = Array.isArray(candidate.themes)
    ? candidate.themes.filter((theme): theme is string => typeof theme === "string").map((theme) => theme.trim())
    : [];

  return {
    summary,
    themes,
  };
}

async function analyzeFeedbackWithGemini(title: string, description: string) {
  const prompt = [
    "Analyze this product feedback and return ONLY valid JSON.",
    "Use this exact schema:",
    '{"category":"Bug | Feature Request | Improvement | Other","sentiment":"Positive | Neutral | Negative","priority_score":1,"summary":"short summary","tags":["tag1","tag2"]}',
    "Rules:",
    "- category must be one of Bug, Feature Request, Improvement, Other",
    "- sentiment must be one of Positive, Neutral, Negative",
    "- priority_score must be an integer from 1 to 10",
    "- summary should be one short sentence",
    "- tags should be a short string array",
    `Title: ${title}`,
    `Description: ${description}`,
  ].join("\n");

  const response = await ai.models.generateContent({
    model: geminiModel,
    contents: prompt,
  });

  const rawText = response.text;

  if (!rawText) {
    throw new Error("Gemini returned an empty response.");
  }

  const parsed = JSON.parse(extractJsonBlock(rawText));
  return normalizeGeminiAnalysis(parsed);
}

async function summarizeFeedbackThemesWithGemini(entries: string[]) {
  const prompt = [
    "Analyze the following recent product feedback entries and return ONLY valid JSON.",
    'Use this exact schema: {"summary":"short paragraph","themes":["theme 1","theme 2","theme 3"]}',
    "Rules:",
    "- themes should contain exactly 3 concise themes when possible",
    "- summary should describe the top trends from the last 7 days",
    "Feedback entries:",
    ...entries,
  ].join("\n");

  const response = await ai.models.generateContent({
    model: geminiModel,
    contents: prompt,
  });

  const rawText = response.text;

  if (!rawText) {
    throw new Error("Gemini returned an empty summary response.");
  }

  const parsed = JSON.parse(extractJsonBlock(rawText));
  return normalizeThemeSummary(parsed);
}

export {
  analyzeFeedbackWithGemini,
  extractJsonBlock,
  normalizeGeminiAnalysis,
  summarizeFeedbackThemesWithGemini,
};
export type { GeminiFeedbackAnalysis, GeminiThemeSummary };

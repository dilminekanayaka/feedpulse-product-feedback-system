import { FeedbackModel } from "../models/feedback.model";
import { FeedbackSummaryModel } from "../models/feedback-summary.model";
import { summarizeFeedbackThemesWithGemini } from "./gemini.service";

type GeneratedFeedbackSummary = {
  periodDays: number;
  periodStart: Date;
  periodEnd: Date;
  totalFeedback: number;
  summary: string;
  themes: string[];
};

async function generateFeedbackSummary(periodDays = 7, maxEntries = 50): Promise<GeneratedFeedbackSummary> {
  const periodEnd = new Date();
  const periodStart = new Date(periodEnd.getTime() - periodDays * 24 * 60 * 60 * 1000);

  const recentFeedback = await FeedbackModel.find({
    createdAt: { $gte: periodStart },
  })
    .sort({ createdAt: -1 })
    .limit(maxEntries);

  if (recentFeedback.length === 0) {
    return {
      periodDays,
      periodStart,
      periodEnd,
      totalFeedback: 0,
      summary: `No feedback was submitted in the last ${periodDays} days.`,
      themes: [],
    };
  }

  const entries = recentFeedback.map(
    (item, index) =>
      `${index + 1}. Title: ${item.title}\nDescription: ${item.description}\nCategory: ${item.category}\nStatus: ${item.status}`,
  );

  const summary = await summarizeFeedbackThemesWithGemini(entries);

  return {
    periodDays,
    periodStart,
    periodEnd,
    totalFeedback: recentFeedback.length,
    summary: summary.summary,
    themes: summary.themes,
  };
}

async function storeWeeklyFeedbackSummary() {
  const generated = await generateFeedbackSummary(7, 50);

  return FeedbackSummaryModel.create({
    source: "weekly",
    periodStart: generated.periodStart,
    periodEnd: generated.periodEnd,
    totalFeedback: generated.totalFeedback,
    summary: generated.summary,
    themes: generated.themes,
    generatedAt: new Date(),
  });
}

async function getLatestWeeklyFeedbackSummary() {
  return FeedbackSummaryModel.findOne({ source: "weekly" }).sort({ generatedAt: -1 });
}

export { generateFeedbackSummary, getLatestWeeklyFeedbackSummary, storeWeeklyFeedbackSummary };
export type { GeneratedFeedbackSummary };

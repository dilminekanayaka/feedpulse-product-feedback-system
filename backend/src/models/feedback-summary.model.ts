import { InferSchemaType, Schema, model, models } from "mongoose";

const feedbackSummarySourceValues = ["weekly"] as const;

const feedbackSummarySchema = new Schema(
  {
    source: {
      type: String,
      enum: feedbackSummarySourceValues,
      required: true,
      index: true,
    },
    periodStart: {
      type: Date,
      required: true,
      index: true,
    },
    periodEnd: {
      type: Date,
      required: true,
      index: true,
    },
    totalFeedback: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    summary: {
      type: String,
      trim: true,
      required: true,
      default: "",
    },
    themes: {
      type: [String],
      default: [],
    },
    generatedAt: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

feedbackSummarySchema.index({ source: 1, generatedAt: -1 });

type FeedbackSummary = InferSchemaType<typeof feedbackSummarySchema>;

const FeedbackSummaryModel = models.FeedbackSummary || model("FeedbackSummary", feedbackSummarySchema);

export { FeedbackSummaryModel, feedbackSummarySchema, feedbackSummarySourceValues };
export type { FeedbackSummary };

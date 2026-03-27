import { InferSchemaType, Schema, model, models } from "mongoose";

const feedbackCategoryValues = [
  "Bug",
  "Feature Request",
  "Improvement",
  "Other",
] as const;

const feedbackStatusValues = ["New", "In Review", "Resolved"] as const;
const feedbackSentimentValues = ["Positive", "Neutral", "Negative"] as const;

const feedbackSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      minlength: 20,
    },
    category: {
      type: String,
      enum: feedbackCategoryValues,
      required: true,
      default: "Other",
    },
    status: {
      type: String,
      enum: feedbackStatusValues,
      default: "New",
      index: true,
    },
    submitterName: {
      type: String,
      trim: true,
      default: "",
    },
    submitterEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
      validate: {
        validator: (value: string) =>
          value === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
        message: "Please provide a valid email address.",
      },
    },
    ai_category: {
      type: String,
      enum: feedbackCategoryValues,
      default: null,
    },
    ai_sentiment: {
      type: String,
      enum: feedbackSentimentValues,
      default: null,
    },
    ai_priority: {
      type: Number,
      min: 1,
      max: 10,
      default: null,
      index: true,
    },
    ai_summary: {
      type: String,
      trim: true,
      default: "",
    },
    ai_tags: {
      type: [String],
      default: [],
    },
    ai_processed: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

feedbackSchema.index({ category: 1 });
feedbackSchema.index({ createdAt: -1 });
feedbackSchema.index({ title: "text", ai_summary: "text" });

type Feedback = InferSchemaType<typeof feedbackSchema>;

const FeedbackModel = models.Feedback || model("Feedback", feedbackSchema);

export {
  FeedbackModel,
  feedbackCategoryValues,
  feedbackSchema,
  feedbackSentimentValues,
  feedbackStatusValues,
};
export type { Feedback };

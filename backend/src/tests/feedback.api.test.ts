import jwt from "jsonwebtoken";
import request from "supertest";

const create = jest.fn();
const find = jest.fn();
const countDocuments = jest.fn();
const findById = jest.fn();
const findByIdAndUpdate = jest.fn();
const findByIdAndDelete = jest.fn();
const limit = jest.fn();
const skip = jest.fn(() => ({ limit }));
const sort = jest.fn(() => ({ skip }));

jest.mock("../models/feedback.model", () => ({
  FeedbackModel: {
    create,
    find: jest.fn(() => ({ sort })),
    countDocuments,
    findById,
    findByIdAndUpdate,
    findByIdAndDelete,
  },
  feedbackCategoryValues: ["Bug", "Feature Request", "Improvement", "Other"],
  feedbackStatusValues: ["New", "In Review", "Resolved"],
  feedbackSentimentValues: ["Positive", "Neutral", "Negative"],
}));

const analyzeFeedbackWithGemini = jest.fn();
const summarizeFeedbackThemesWithGemini = jest.fn();

jest.mock("../services/gemini.service", () => ({
  analyzeFeedbackWithGemini,
  summarizeFeedbackThemesWithGemini,
}));

jest.mock("../services/feedback-summary.service", () => ({
  generateFeedbackSummary: jest.fn(),
  getLatestWeeklyFeedbackSummary: jest.fn(),
}));

import { app } from "../app";

describe("feedback API", () => {
  const adminToken = jwt.sign(
    { sub: "admin-id", email: "admin@example.com", role: "admin" },
    process.env.JWT_SECRET || "test-jwt-secret",
  );

  beforeEach(() => {
    jest.clearAllMocks();
    limit.mockReset();
    skip.mockClear();
    sort.mockClear();
  });

  it("POST /api/feedback saves valid feedback and triggers AI analysis", async () => {
    const feedbackDoc = {
      _id: "507f191e810c19729de860ea",
      title: "Dark mode too bright",
      description: "The dark theme is too bright on settings and feels uncomfortable at night.",
      category: "Bug",
      status: "New",
      ai_processed: false,
      save: jest.fn().mockResolvedValue(undefined),
    };

    create.mockResolvedValue(feedbackDoc);
    analyzeFeedbackWithGemini.mockResolvedValue({
      category: "Bug",
      sentiment: "Negative",
      priority_score: 8,
      summary: "Dark mode brightness needs refinement.",
      tags: ["UI", "Accessibility"],
    });

    const response = await request(app).post("/api/feedback").send({
      title: "Dark mode too bright",
      description: "The dark theme is too bright on settings and feels uncomfortable at night.",
      category: "Bug",
      submitterName: "Pasin",
      submitterEmail: "pasin@example.com",
    });

    expect(response.status).toBe(201);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Dark mode too bright",
        category: "Bug",
        submitterName: "Pasin",
      }),
    );
    expect(analyzeFeedbackWithGemini).toHaveBeenCalledWith(
      "Dark mode too bright",
      "The dark theme is too bright on settings and feels uncomfortable at night.",
    );
    expect(feedbackDoc.save).toHaveBeenCalled();
    expect(response.body.data).toEqual(
      expect.objectContaining({
        ai_category: "Bug",
        ai_sentiment: "Negative",
        ai_priority: 8,
        ai_summary: "Dark mode brightness needs refinement.",
        ai_tags: ["UI", "Accessibility"],
        ai_processed: true,
      }),
    );
  });

  it("POST /api/feedback rejects an empty title", async () => {
    const response = await request(app).post("/api/feedback").send({
      title: "",
      description: "This description is long enough to pass the minimum length validation.",
      category: "Bug",
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Title is required.");
    expect(create).not.toHaveBeenCalled();
    expect(analyzeFeedbackWithGemini).not.toHaveBeenCalled();
  });

  it("PATCH /api/feedback/:id updates the status for an authenticated admin", async () => {
    findByIdAndUpdate.mockResolvedValue({
      _id: "507f191e810c19729de860eb",
      title: "Add export feature",
      status: "Resolved",
    });

    const response = await request(app)
      .patch("/api/feedback/507f191e810c19729de860eb")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "Resolved" });

    expect(response.status).toBe(200);
    expect(findByIdAndUpdate).toHaveBeenCalledWith(
      "507f191e810c19729de860eb",
      { status: "Resolved" },
      { new: true, runValidators: true },
    );
    expect(response.body.data).toEqual(
      expect.objectContaining({
        _id: "507f191e810c19729de860eb",
        status: "Resolved",
      }),
    );
  });

  it("protected routes reject unauthenticated requests", async () => {
    const response = await request(app).get("/api/feedback");

    expect(response.status).toBe(401);
    expect(response.body).toEqual(
      expect.objectContaining({
        success: false,
        error: "UNAUTHORIZED",
      }),
    );
  });
});

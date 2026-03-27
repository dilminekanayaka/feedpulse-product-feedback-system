import type { Request, Response } from "express";

jest.mock("../models/feedback.model", () => ({
  FeedbackModel: { create: jest.fn() },
  feedbackCategoryValues: ["Bug", "Feature Request", "Improvement", "Other"],
  feedbackStatusValues: ["New", "In Review", "Resolved"],
}));

jest.mock("../services/gemini.service", () => ({
  analyzeFeedbackWithGemini: jest.fn(),
  summarizeFeedbackThemesWithGemini: jest.fn(),
}));

import { createFeedback } from "../controllers/feedback.controller";

describe("feedback controller", () => {
  it("returns 400 when title is missing", async () => {
    const request = {
      body: {
        title: "",
        description: "This is a valid description with enough characters.",
        category: "Bug",
      },
    } as Request;

    const json = jest.fn();
    const response = {
      status: jest.fn().mockReturnValue({ json }),
    } as unknown as Response;

    await createFeedback(request, response);

    expect(response.status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Title is required." }),
    );
  });
});

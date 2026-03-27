import type { Request, Response } from "express";

const countDocuments = jest.fn();
const limit = jest.fn();
const skip = jest.fn(() => ({ limit }));
const sort = jest.fn(() => ({ skip }));
const find = jest.fn(() => ({ sort }));

jest.mock("../models/feedback.model", () => ({
  FeedbackModel: { create: jest.fn(), find, countDocuments },
  feedbackCategoryValues: ["Bug", "Feature Request", "Improvement", "Other"],
  feedbackStatusValues: ["New", "In Review", "Resolved"],
}));

jest.mock("../services/gemini.service", () => ({
  analyzeFeedbackWithGemini: jest.fn(),
  summarizeFeedbackThemesWithGemini: jest.fn(),
}));

import { createFeedback, getFeedbackList } from "../controllers/feedback.controller";

describe("feedback controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

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

  it("returns paginated feedback metadata", async () => {
    limit.mockResolvedValueOnce([{ _id: "1", title: "Need dark mode" }]);
    countDocuments.mockResolvedValueOnce(17);

    const request = {
      query: {
        page: "2",
        limit: "5",
        search: "dark",
        sortBy: "createdAt",
        sortOrder: "desc",
      },
    } as unknown as Request;

    const json = jest.fn();
    const response = {
      status: jest.fn().mockReturnValue({ json }),
    } as unknown as Response;

    await getFeedbackList(request, response);

    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({
        $or: [
          { title: { $regex: "dark", $options: "i" } },
          { ai_summary: { $regex: "dark", $options: "i" } },
        ],
      }),
    );
    expect(sort).toHaveBeenCalledWith({ createdAt: -1 });
    expect(skip).toHaveBeenCalledWith(5);
    expect(limit).toHaveBeenCalledWith(5);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        meta: expect.objectContaining({ page: 2, limit: 5, total: 17, totalPages: 4 }),
      }),
    );
  });
});

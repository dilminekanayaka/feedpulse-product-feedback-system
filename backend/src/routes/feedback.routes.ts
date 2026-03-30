import { Router } from "express";

import {
  createFeedback,
  deleteFeedback,
  getFeedbackById,
  getFeedbackList,
  getFeedbackSummary,
  getLatestWeeklySummary,
  reanalyzeFeedback,
  updateFeedbackStatus,
} from "../controllers/feedback.controller";
import { requireAdminAuth } from "../middleware/auth.middleware";
import { feedbackSubmissionRateLimit } from "../middleware/feedback-rate-limit.middleware";

const feedbackRouter = Router();

feedbackRouter.post("/", feedbackSubmissionRateLimit, createFeedback);
feedbackRouter.get("/summary/weekly/latest", requireAdminAuth, getLatestWeeklySummary);
feedbackRouter.get("/summary", requireAdminAuth, getFeedbackSummary);
feedbackRouter.get("/", requireAdminAuth, getFeedbackList);
feedbackRouter.get("/:id", requireAdminAuth, getFeedbackById);
feedbackRouter.post("/:id/reanalyze", requireAdminAuth, reanalyzeFeedback);
feedbackRouter.patch("/:id", requireAdminAuth, updateFeedbackStatus);
feedbackRouter.delete("/:id", requireAdminAuth, deleteFeedback);

export { feedbackRouter };

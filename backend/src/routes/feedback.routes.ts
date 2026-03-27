import { Router } from "express";

import {
  createFeedback,
  deleteFeedback,
  getFeedbackById,
  getFeedbackList,
  getFeedbackSummary,
  reanalyzeFeedback,
  updateFeedbackStatus,
} from "../controllers/feedback.controller";
import { requireAdminAuth } from "../middleware/auth.middleware";

const feedbackRouter = Router();

feedbackRouter.post("/", createFeedback);
feedbackRouter.get("/summary", requireAdminAuth, getFeedbackSummary);
feedbackRouter.get("/", requireAdminAuth, getFeedbackList);
feedbackRouter.get("/:id", requireAdminAuth, getFeedbackById);
feedbackRouter.post("/:id/reanalyze", requireAdminAuth, reanalyzeFeedback);
feedbackRouter.patch("/:id", requireAdminAuth, updateFeedbackStatus);
feedbackRouter.delete("/:id", requireAdminAuth, deleteFeedback);

export { feedbackRouter };

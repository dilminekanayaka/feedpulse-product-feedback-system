import { Router } from "express";

import {
  createFeedback,
  deleteFeedback,
  getFeedbackById,
  getFeedbackList,
  updateFeedbackStatus,
} from "../controllers/feedback.controller";
import { requireAdminAuth } from "../middleware/auth.middleware";

const feedbackRouter = Router();

feedbackRouter.post("/", createFeedback);
feedbackRouter.get("/", requireAdminAuth, getFeedbackList);
feedbackRouter.get("/:id", requireAdminAuth, getFeedbackById);
feedbackRouter.patch("/:id", requireAdminAuth, updateFeedbackStatus);
feedbackRouter.delete("/:id", requireAdminAuth, deleteFeedback);

export { feedbackRouter };

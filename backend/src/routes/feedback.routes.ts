import { Router } from "express";

import {
  createFeedback,
  deleteFeedback,
  getFeedbackById,
  getFeedbackList,
  updateFeedbackStatus,
} from "../controllers/feedback.controller";

const feedbackRouter = Router();

feedbackRouter.get("/", getFeedbackList);
feedbackRouter.get("/:id", getFeedbackById);
feedbackRouter.post("/", createFeedback);
feedbackRouter.patch("/:id", updateFeedbackStatus);
feedbackRouter.delete("/:id", deleteFeedback);

export { feedbackRouter };

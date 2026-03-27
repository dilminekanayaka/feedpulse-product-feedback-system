import { Router } from "express";

import {
  createFeedback,
  getFeedbackById,
  getFeedbackList,
  updateFeedbackStatus,
} from "../controllers/feedback.controller";

const feedbackRouter = Router();

feedbackRouter.get("/", getFeedbackList);
feedbackRouter.get("/:id", getFeedbackById);
feedbackRouter.post("/", createFeedback);
feedbackRouter.patch("/:id", updateFeedbackStatus);

export { feedbackRouter };

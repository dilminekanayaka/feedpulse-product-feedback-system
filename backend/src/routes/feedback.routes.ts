import { Router } from "express";

import {
  createFeedback,
  getFeedbackById,
  getFeedbackList,
} from "../controllers/feedback.controller";

const feedbackRouter = Router();

feedbackRouter.get("/", getFeedbackList);
feedbackRouter.get("/:id", getFeedbackById);
feedbackRouter.post("/", createFeedback);

export { feedbackRouter };

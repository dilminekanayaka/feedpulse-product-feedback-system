import { Router } from "express";

import {
  createFeedback,
  getFeedbackList,
} from "../controllers/feedback.controller";

const feedbackRouter = Router();

feedbackRouter.get("/", getFeedbackList);
feedbackRouter.post("/", createFeedback);

export { feedbackRouter };

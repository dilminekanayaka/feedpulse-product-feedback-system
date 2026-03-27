import { Router } from "express";

import { createFeedback } from "../controllers/feedback.controller";

const feedbackRouter = Router();

feedbackRouter.post("/", createFeedback);

export { feedbackRouter };

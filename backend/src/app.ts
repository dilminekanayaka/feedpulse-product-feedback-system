import cors from "cors";
import express from "express";

import { env } from "./config/env";
import { feedbackRouter } from "./routes/feedback.routes";
import { healthRouter } from "./routes/health.routes";

const app = express();

app.use(
  cors({
    origin: env.clientUrl,
    credentials: true,
  }),
);
app.use(express.json());

app.get("/", (_request, response) => {
  response.json({
    success: true,
    message: "FeedPulse backend is running.",
  });
});

app.use("/health", healthRouter);
app.use("/api/feedback", feedbackRouter);

export { app };

import cors from "cors";
import express from "express";

import { env } from "./config/env";
import { authRouter } from "./routes/auth.routes";
import { feedbackRouter } from "./routes/feedback.routes";
import { healthRouter } from "./routes/health.routes";

const app = express();

app.set("trust proxy", true);
app.use(
  cors({
    origin: env.clientUrl,
    credentials: true,
  }),
);
app.use(express.json());

app.get("/", (_request, response) => {
  response.status(200).json({
    success: true,
    data: {
      service: "feedpulse-backend",
      status: "ok",
    },
    error: null,
    message: "FeedPulse backend is running.",
  });
});

app.use("/health", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api/feedback", feedbackRouter);

export { app };

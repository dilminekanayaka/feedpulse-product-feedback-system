import { Router } from "express";

const healthRouter = Router();

healthRouter.get("/", (_request, response) => {
  response.status(200).json({
    success: true,
    data: {
      status: "ok",
      service: "feedpulse-backend",
      timestamp: new Date().toISOString(),
    },
    error: null,
    message: "Server is healthy.",
  });
});

export { healthRouter };

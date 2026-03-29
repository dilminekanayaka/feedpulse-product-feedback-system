import { NextFunction, Request, Response } from "express";

const SUBMISSION_LIMIT = 5;
const WINDOW_MS = 60 * 60 * 1000;
const submissionTracker = new Map<string, number[]>();

function getClientIp(request: Request) {
  const forwardedFor = request.headers["x-forwarded-for"];

  if (typeof forwardedFor === "string" && forwardedFor.length > 0) {
    return forwardedFor.split(",")[0].trim();
  }

  if (Array.isArray(forwardedFor) && forwardedFor.length > 0) {
    return forwardedFor[0];
  }

  return request.ip || "unknown";
}

function feedbackSubmissionRateLimit(request: Request, response: Response, next: NextFunction) {
  const now = Date.now();
  const clientIp = getClientIp(request);
  const previousEntries = submissionTracker.get(clientIp) || [];
  const recentEntries = previousEntries.filter((timestamp) => now - timestamp < WINDOW_MS);

  if (recentEntries.length >= SUBMISSION_LIMIT) {
    return response.status(429).json({
      success: false,
      data: null,
      error: "RATE_LIMIT_EXCEEDED",
      message: "Too many feedback submissions from this IP. Please try again in about an hour.",
    });
  }

  recentEntries.push(now);
  submissionTracker.set(clientIp, recentEntries);

  return next();
}

export { feedbackSubmissionRateLimit };

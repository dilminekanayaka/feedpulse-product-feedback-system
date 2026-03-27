import { Request, Response } from "express";

import { FeedbackModel, feedbackCategoryValues } from "../models/feedback.model";

const allowedCategories = new Set<string>(feedbackCategoryValues);

function sanitizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

async function createFeedback(request: Request, response: Response) {
  try {
    const title = sanitizeText(request.body.title);
    const description = sanitizeText(request.body.description);
    const category = sanitizeText(request.body.category) || "Other";
    const submitterName = sanitizeText(request.body.submitterName);
    const submitterEmail = sanitizeText(request.body.submitterEmail);

    if (!title) {
      return response.status(400).json({
        success: false,
        data: null,
        error: "VALIDATION_ERROR",
        message: "Title is required.",
      });
    }

    if (!description) {
      return response.status(400).json({
        success: false,
        data: null,
        error: "VALIDATION_ERROR",
        message: "Description is required.",
      });
    }

    if (description.length < 20) {
      return response.status(400).json({
        success: false,
        data: null,
        error: "VALIDATION_ERROR",
        message: "Description must be at least 20 characters long.",
      });
    }

    if (!allowedCategories.has(category)) {
      return response.status(400).json({
        success: false,
        data: null,
        error: "VALIDATION_ERROR",
        message: "Category must be one of: Bug, Feature Request, Improvement, Other.",
      });
    }

    const feedback = await FeedbackModel.create({
      title,
      description,
      category,
      submitterName,
      submitterEmail,
    });

    return response.status(201).json({
      success: true,
      data: feedback,
      error: null,
      message: "Feedback submitted successfully.",
    });
  } catch (error) {
    console.error("Failed to create feedback.", error);

    return response.status(500).json({
      success: false,
      data: null,
      error: "INTERNAL_SERVER_ERROR",
      message: "Something went wrong while saving feedback.",
    });
  }
}

export { createFeedback };

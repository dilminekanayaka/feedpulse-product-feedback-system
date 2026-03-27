import { FilterQuery, isValidObjectId } from "mongoose";
import { Request, Response } from "express";

import {
  Feedback,
  FeedbackModel,
  feedbackCategoryValues,
  feedbackStatusValues,
} from "../models/feedback.model";

const allowedCategories = new Set<string>(feedbackCategoryValues);
const allowedStatuses = new Set<string>(feedbackStatusValues);

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

async function getFeedbackList(request: Request, response: Response) {
  try {
    const category = sanitizeText(request.query.category);
    const status = sanitizeText(request.query.status);

    if (category && !allowedCategories.has(category)) {
      return response.status(400).json({
        success: false,
        data: null,
        error: "VALIDATION_ERROR",
        message: "Category filter must be one of: Bug, Feature Request, Improvement, Other.",
      });
    }

    if (status && !allowedStatuses.has(status)) {
      return response.status(400).json({
        success: false,
        data: null,
        error: "VALIDATION_ERROR",
        message: "Status filter must be one of: New, In Review, Resolved.",
      });
    }

    const query: FilterQuery<Feedback> = {};

    if (category) {
      query.category = category;
    }

    if (status) {
      query.status = status;
    }

    const feedback = await FeedbackModel.find(query).sort({ createdAt: -1 });

    return response.status(200).json({
      success: true,
      data: feedback,
      error: null,
      message: "Feedback fetched successfully.",
    });
  } catch (error) {
    console.error("Failed to fetch feedback.", error);

    return response.status(500).json({
      success: false,
      data: null,
      error: "INTERNAL_SERVER_ERROR",
      message: "Something went wrong while fetching feedback.",
    });
  }
}

async function getFeedbackById(request: Request, response: Response) {
  try {
    const { id } = request.params;

    if (!isValidObjectId(id)) {
      return response.status(400).json({
        success: false,
        data: null,
        error: "VALIDATION_ERROR",
        message: "Feedback id is not valid.",
      });
    }

    const feedback = await FeedbackModel.findById(id);

    if (!feedback) {
      return response.status(404).json({
        success: false,
        data: null,
        error: "NOT_FOUND",
        message: "Feedback not found.",
      });
    }

    return response.status(200).json({
      success: true,
      data: feedback,
      error: null,
      message: "Feedback fetched successfully.",
    });
  } catch (error) {
    console.error("Failed to fetch feedback by id.", error);

    return response.status(500).json({
      success: false,
      data: null,
      error: "INTERNAL_SERVER_ERROR",
      message: "Something went wrong while fetching the feedback item.",
    });
  }
}

export { createFeedback, getFeedbackById, getFeedbackList };

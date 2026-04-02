import { FilterQuery, isValidObjectId } from "mongoose";
import { Request, Response } from "express";

import {
  Feedback,
  FeedbackModel,
  feedbackCategoryValues,
  feedbackStatusValues,
} from "../models/feedback.model";
import {
  generateFeedbackSummary,
  getLatestWeeklyFeedbackSummary,
} from "../services/feedback-summary.service";
import { analyzeFeedbackWithGemini } from "../services/gemini.service";

const allowedCategories = new Set<string>(feedbackCategoryValues);
const allowedStatuses = new Set<string>(feedbackStatusValues);
const allowedSortFields = new Set(["createdAt", "ai_priority", "ai_sentiment", "title"]);
const allowedSortOrders = new Set(["asc", "desc"]);

type FeedbackDocument = InstanceType<typeof FeedbackModel>;

function sanitizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function parsePositiveInteger(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

async function applyGeminiAnalysis(feedback: FeedbackDocument) {
  const analysis = await analyzeFeedbackWithGemini(feedback.title, feedback.description);

  feedback.ai_category = analysis.category;
  feedback.ai_sentiment = analysis.sentiment;
  feedback.ai_priority = analysis.priority_score;
  feedback.ai_summary = analysis.summary;
  feedback.ai_tags = analysis.tags;
  feedback.ai_processed = true;

  await feedback.save();
  return feedback;
}

async function applyGeminiFallback(feedback: FeedbackDocument) {
  feedback.ai_category = feedback.ai_category ?? "Other";
  feedback.ai_sentiment = feedback.ai_sentiment ?? "Neutral";
  feedback.ai_priority = typeof feedback.ai_priority === "number" ? feedback.ai_priority : 1;
  feedback.ai_summary = feedback.ai_summary || "AI analysis is temporarily unavailable for this submission.";
  feedback.ai_tags = Array.isArray(feedback.ai_tags) ? feedback.ai_tags : [];
  feedback.ai_processed = false;

  await feedback.save();
  return feedback;
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

    try {
      await applyGeminiAnalysis(feedback);
    } catch (aiError) {
      console.error("Gemini analysis failed.", aiError);
      await applyGeminiFallback(feedback);
    }

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

async function getFeedbackSummary(_request: Request, response: Response) {
  try {
    const summary = await generateFeedbackSummary(7, 50);

    return response.status(200).json({
      success: true,
      data: {
        period_days: summary.periodDays,
        total_feedback: summary.totalFeedback,
        summary: summary.summary,
        themes: summary.themes,
      },
      error: null,
      message: "Feedback summary generated successfully.",
    });
  } catch (error) {
    console.error("Failed to generate feedback summary.", error);

    return response.status(500).json({
      success: false,
      data: null,
      error: "INTERNAL_SERVER_ERROR",
      message: "Something went wrong while generating feedback summary.",
    });
  }
}

async function getLatestWeeklySummary(_request: Request, response: Response) {
  try {
    const snapshot = await getLatestWeeklyFeedbackSummary();

    if (!snapshot) {
      return response.status(404).json({
        success: false,
        data: null,
        error: "NOT_FOUND",
        message: "No weekly feedback summary has been generated yet.",
      });
    }

    return response.status(200).json({
      success: true,
      data: snapshot,
      error: null,
      message: "Latest weekly feedback summary fetched successfully.",
    });
  } catch (error) {
    console.error("Failed to fetch latest weekly feedback summary.", error);

    return response.status(500).json({
      success: false,
      data: null,
      error: "INTERNAL_SERVER_ERROR",
      message: "Something went wrong while fetching the weekly feedback summary.",
    });
  }
}

async function getFeedbackList(request: Request, response: Response) {
  try {
    const category = sanitizeText(request.query.category);
    const status = sanitizeText(request.query.status);
    const search = sanitizeText(request.query.search);
    const sortBy = sanitizeText(request.query.sortBy) || "createdAt";
    const sortOrder = sanitizeText(request.query.sortOrder) || "desc";
    const page = parsePositiveInteger(request.query.page, 1);
    const limit = Math.min(parsePositiveInteger(request.query.limit, 10), 50);

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

    if (!allowedSortFields.has(sortBy)) {
      return response.status(400).json({
        success: false,
        data: null,
        error: "VALIDATION_ERROR",
        message: "sortBy must be one of: createdAt, ai_priority, ai_sentiment, title.",
      });
    }

    if (!allowedSortOrders.has(sortOrder)) {
      return response.status(400).json({
        success: false,
        data: null,
        error: "VALIDATION_ERROR",
        message: "sortOrder must be one of: asc, desc.",
      });
    }

    const query: FilterQuery<Feedback> = {};

    if (category) {
      query.category = category;
    }

    if (status) {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { ai_summary: { $regex: search, $options: "i" } },
      ];
    }

    const sortDirection = sortOrder === "asc" ? 1 : -1;
    const skip = (page - 1) * limit;

    const [feedback, total] = await Promise.all([
      FeedbackModel.find(query)
        .sort({ [sortBy]: sortDirection, createdAt: -1 })
        .skip(skip)
        .limit(limit),
      FeedbackModel.countDocuments(query),
    ]);

    return response.status(200).json({
      success: true,
      data: feedback,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        sortBy,
        sortOrder,
        search,
      },
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

async function reanalyzeFeedback(request: Request, response: Response) {
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

    try {
      const updatedFeedback = await applyGeminiAnalysis(feedback);

      return response.status(200).json({
        success: true,
        data: updatedFeedback,
        error: null,
        message: "Feedback AI analysis refreshed successfully.",
      });
    } catch (aiError) {
      console.error("Gemini reanalysis failed.", aiError);
      const fallbackFeedback = await applyGeminiFallback(feedback);

      return response.status(200).json({
        success: true,
        data: fallbackFeedback,
        error: null,
        message: "AI was temporarily unavailable, so fallback analysis values were kept for this feedback.",
      });
    }
  } catch (error) {
    console.error("Failed to reanalyze feedback.", error);

    return response.status(500).json({
      success: false,
      data: null,
      error: "INTERNAL_SERVER_ERROR",
      message: "Something went wrong while reanalyzing feedback.",
    });
  }
}

async function updateFeedbackStatus(request: Request, response: Response) {
  try {
    const { id } = request.params;
    const status = sanitizeText(request.body.status);

    if (!isValidObjectId(id)) {
      return response.status(400).json({
        success: false,
        data: null,
        error: "VALIDATION_ERROR",
        message: "Feedback id is not valid.",
      });
    }

    if (!status) {
      return response.status(400).json({
        success: false,
        data: null,
        error: "VALIDATION_ERROR",
        message: "Status is required.",
      });
    }

    if (!allowedStatuses.has(status)) {
      return response.status(400).json({
        success: false,
        data: null,
        error: "VALIDATION_ERROR",
        message: "Status must be one of: New, In Review, Resolved.",
      });
    }

    const updatedFeedback = await FeedbackModel.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true },
    );

    if (!updatedFeedback) {
      return response.status(404).json({
        success: false,
        data: null,
        error: "NOT_FOUND",
        message: "Feedback not found.",
      });
    }

    return response.status(200).json({
      success: true,
      data: updatedFeedback,
      error: null,
      message: "Feedback status updated successfully.",
    });
  } catch (error) {
    console.error("Failed to update feedback status.", error);

    return response.status(500).json({
      success: false,
      data: null,
      error: "INTERNAL_SERVER_ERROR",
      message: "Something went wrong while updating feedback status.",
    });
  }
}

async function deleteFeedback(request: Request, response: Response) {
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

    const deletedFeedback = await FeedbackModel.findByIdAndDelete(id);

    if (!deletedFeedback) {
      return response.status(404).json({
        success: false,
        data: null,
        error: "NOT_FOUND",
        message: "Feedback not found.",
      });
    }

    return response.status(200).json({
      success: true,
      data: deletedFeedback,
      error: null,
      message: "Feedback deleted successfully.",
    });
  } catch (error) {
    console.error("Failed to delete feedback.", error);

    return response.status(500).json({
      success: false,
      data: null,
      error: "INTERNAL_SERVER_ERROR",
      message: "Something went wrong while deleting feedback.",
    });
  }
}

export {
  createFeedback,
  deleteFeedback,
  getFeedbackById,
  getFeedbackList,
  getFeedbackSummary,
  getLatestWeeklySummary,
  reanalyzeFeedback,
  updateFeedbackStatus,
};

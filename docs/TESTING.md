# Backend Test Cases Documentation

### Test Case 1
Name:
- `POST /api/feedback saves valid feedback and triggers AI analysis`

File:
- `src/tests/feedback.api.test.ts`

Objective:
- Confirm that a valid feedback submission is accepted.
- Confirm the feedback document is created.
- Confirm Gemini analysis is triggered.
- Confirm AI fields are saved onto the feedback response.

What is mocked:
- `FeedbackModel.create`
- `analyzeFeedbackWithGemini`
- `feedback.save`

Input:
- title: `Dark mode too bright`
- description: valid string over 20 characters
- category: `Bug`
- submitterName: `Pasin`
- submitterEmail: `pasin@example.com`

Expected result:
- HTTP status `201`
- feedback is saved to the database layer
- Gemini analysis function is called once
- response contains:
  - `ai_category`
  - `ai_sentiment`
  - `ai_priority`
  - `ai_summary`
  - `ai_tags`
  - `ai_processed: true`

Why this matters:
- This is the most important happy-path backend flow in the whole project.

### Test Case 2
Name:
- `POST /api/feedback rejects an empty title`

File:
- `src/tests/feedback.api.test.ts`

Objective:
- Confirm validation blocks invalid submissions before saving.

Input:
- title: empty string
- description: valid long description
- category: `Bug`

Expected result:
- HTTP status `400`
- message: `Title is required.`
- `FeedbackModel.create` is not called
- Gemini analysis is not called

Why this matters:
- Prevents bad data from reaching MongoDB.

### Test Case 3
Name:
- `PATCH /api/feedback/:id updates the status for an authenticated admin`

File:
- `src/tests/feedback.api.test.ts`

Objective:
- Confirm admin-protected status updates work correctly.

What is mocked:
- `FeedbackModel.findByIdAndUpdate`
- JWT admin token

Input:
- valid feedback id
- request body: `{ status: "Resolved" }`
- valid admin bearer token

Expected result:
- HTTP status `200`
- `findByIdAndUpdate` is called with:
  - target id
  - updated status
  - `{ new: true, runValidators: true }`
- response contains updated feedback object

Why this matters:
- Status management is core dashboard CRUD functionality.

### Test Case 4
Name:
- `protected routes reject unauthenticated requests`

File:
- `src/tests/feedback.api.test.ts`

Objective:
- Confirm protected admin endpoints cannot be accessed without a token.

Input:
- `GET /api/feedback` without `Authorization` header

Expected result:
- HTTP status `401`
- response contains:
  - `success: false`
  - `error: "UNAUTHORIZED"`

Why this matters:
- Confirms dashboard data is not publicly accessible.

### Test Case 5
Name:
- `returns 400 when title is missing`

File:
- `src/tests/feedback.controller.test.ts`

Objective:
- Validate controller-level title validation behavior directly.

Method:
- Calls `createFeedback()` with mocked Express request/response objects.

Expected result:
- `response.status(400)` is called
- JSON payload contains `Title is required.`

Why this matters:
- Gives direct controller-level validation coverage in addition to route-level coverage.

### Test Case 6
Name:
- `returns paginated feedback metadata`

File:
- `src/tests/feedback.controller.test.ts`

Objective:
- Confirm pagination and search query handling work correctly.

What is mocked:
- `FeedbackModel.find`
- `sort`
- `skip`
- `limit`
- `countDocuments`

Input:
- page: `2`
- limit: `5`
- search: `dark`
- sortBy: `createdAt`
- sortOrder: `desc`

Expected result:
- query includes text search on:
  - `title`
  - `ai_summary`
- pagination metadata includes:
  - `page: 2`
  - `limit: 5`
  - `total: 17`
  - `totalPages: 4`

Why this matters:
- Dashboard list page depends on correct pagination and filtering.

### Test Case 7
Name:
- `normalizes invalid values safely`

File:
- `src/tests/gemini.service.test.ts`

Objective:
- Confirm Gemini parsing logic safely normalizes bad or unexpected AI output.

Input:
- invalid category
- invalid sentiment
- out-of-range priority
- mixed valid/invalid tags
- summary with whitespace

Expected result:
- invalid category falls back to `Other`
- invalid sentiment falls back to `Neutral`
- invalid priority falls back to `5`
- summary is trimmed
- only valid string tags remain

Why this matters:
- AI responses are not always perfectly structured, so backend normalization is critical.

### Test Case 8
Name:
- `extracts json from fenced markdown`

File:
- `src/tests/gemini.service.test.ts`

Objective:
- Confirm Gemini helper can parse JSON wrapped inside markdown code fences.

Input:
- fenced JSON string

Expected result:
- returns clean JSON string without code fences

Why this matters:
- LLMs often return fenced JSON even when asked for raw JSON.

### Test Case 9
Name:
- `returns 401 when authorization header is missing`

File:
- `src/tests/auth.middleware.test.ts`

Objective:
- Confirm middleware blocks unauthenticated requests at middleware level.

Expected result:
- status `401`
- error `UNAUTHORIZED`
- `next()` is not called

Why this matters:
- Confirms auth protection logic independently from route tests.

## Mocking Strategy

The test suite uses mocks to keep tests fast, stable, and isolated.

Main mocks used:
- Mongoose model methods such as:
  - `create`
  - `find`
  - `findByIdAndUpdate`
  - `findByIdAndDelete`
  - `countDocuments`
- Gemini service functions such as:
  - `analyzeFeedbackWithGemini`
  - `summarizeFeedbackThemesWithGemini`
- JWT token generation for protected route testing


## What These Tests Prove

This backend test coverage proves that:
- feedback submission validation works
- valid feedback is accepted and AI analysis is triggered
- admin-only route protection works
- feedback status updates work
- pagination logic works
- Gemini response parsing is safe and resilient

## Remaining Future Test

- `DELETE /api/feedback/:id` success and not-found cases
- `POST /api/feedback/:id/reanalyze` success and Gemini fallback case
- login endpoint success and invalid credentials
- rate-limit middleware behavior
- weekly summary endpoint success and empty-state behavior


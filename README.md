# FeedPulse Product Feedback System

FeedPulse is a full-stack product feedback management system.

The goal of this project is to let users submit product feedback through a public form, store that feedback in MongoDB, analyze it with Google Gemini AI, and give admins a dashboard to review, filter, and manage submissions.

## Project Goal

This project is designed to show:

- frontend development with a clean feedback submission flow
- backend API design with Express
- database modeling with MongoDB and Mongoose
- AI integration using Google Gemini
- product thinking through prioritization, filtering, and admin workflows

## Core Features

- Public feedback submission form
- Validation for required fields
- Store feedback in MongoDB
- AI analysis for category, sentiment, priority, summary, and tags
- Admin login and protected dashboard
- Feedback filtering by category and status
- Status updates for each feedback item
- REST API for frontend and admin operations

## Suggested Tech Stack

- Frontend: Next.js
- Backend: Node.js + Express
- Database: MongoDB + Mongoose
- AI: Google Gemini API
- Language: TypeScript preferred
- Styling: Tailwind CSS or another CSS framework

## High-Level Architecture

1. A user submits feedback from the public page.
2. The frontend sends the data to the backend API.
3. The backend validates and saves the feedback in MongoDB.
4. The backend sends the feedback text to Gemini for AI analysis.
5. Gemini returns structured analysis data.
6. The backend saves the AI results on the feedback record.
7. The admin dashboard displays feedback, sentiment, priority, and status.

## Main Data To Store

Each feedback item should include:

- title
- description
- category
- status
- submitter name
- submitter email
- AI category
- AI sentiment
- AI priority
- AI summary
- AI tags
- createdAt
- updatedAt

## Required API Endpoints

- `POST /api/feedback` - submit new feedback
- `GET /api/feedback` - get all feedback
- `GET /api/feedback/:id` - get one feedback item
- `PATCH /api/feedback/:id` - update feedback status
- `DELETE /api/feedback/:id` - delete feedback
- `GET /api/feedback/summary` - get AI summary or trends
- `POST /api/auth/login` - admin login

## Starter Folder Structure

```text
feedpulse-product-feedback-system/
├── frontend/
│   ├── app/
│   │   ├── dashboard/
│   │   ├── login/
│   │   └── page.tsx
│   ├── components/
│   ├── lib/
│   ├── public/
│   ├── package.json
│   └── .env.local.example
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── app.ts
│   │   └── server.ts
│   ├── package.json
│   └── .env.example
├── README.md
├── .gitignore
└── LICENSE
```

## Exact Local Setup Steps

These steps are written for a complete beginner.

### 1. Install the software you need

Install these before writing code:

- Node.js 20 LTS from [nodejs.org](https://nodejs.org/)
- Git from [git-scm.com](https://git-scm.com/)
- VS Code from [code.visualstudio.com](https://code.visualstudio.com/)

You also need accounts for:

- Google AI Studio for a Gemini API key
- MongoDB Atlas for a free cloud database
- GitHub for pushing your repository

### 2. Check that Node and Git are installed

Open PowerShell and run:

```powershell
node -v
npm -v
git --version
```

If you see version numbers, the tools are installed correctly.

### 3. Open the project folder

```powershell
cd F:\GITHUB\feedpulse-product-feedback-system
```

### 4. Create your environment variable files

Backend environment file:

```powershell
Copy-Item backend\.env.example backend\.env
```

Frontend environment file:

```powershell
Copy-Item frontend\.env.local.example frontend\.env.local
```

### 5. Fill the backend environment variables

Open `backend/.env` and add your real values:

```env
PORT=4000
MONGO_URI=your_mongodb_connection_string
GEMINI_API_KEY=your_gemini_api_key
JWT_SECRET=your_long_random_secret
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=admin123
CLIENT_URL=http://localhost:3000
```

### 6. Fill the frontend environment variables

Open `frontend/.env.local` and add:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

### 7. Get your MongoDB connection string

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free cluster
3. Create a database user
4. Allow your current IP address
5. Click `Connect`
6. Choose `Drivers`
7. Copy the connection string
8. Paste it into `backend/.env` as `MONGO_URI`

### 8. Get your Gemini API key

1. Go to [Google AI Studio](https://aistudio.google.com)
2. Sign in
3. Create API key
4. Copy the key
5. Paste it into `backend/.env` as `GEMINI_API_KEY`

### 9. Install backend dependencies

When the backend code is ready, run:

```powershell
cd backend
npm install
```

### 10. Install frontend dependencies

In a new PowerShell window:

```powershell
cd F:\GITHUB\feedpulse-product-feedback-system\frontend
npm install
```

### 11. Start the backend

```powershell
cd F:\GITHUB\feedpulse-product-feedback-system\backend
npm run dev
```

Expected result:

- backend starts on `http://localhost:4000`
- MongoDB connects successfully

### 12. Start the frontend

Open another terminal:

```powershell
cd F:\GITHUB\feedpulse-product-feedback-system\frontend
npm run dev
```

Expected result:

- frontend starts on `http://localhost:3000`

### 13. Test the full app locally

Check:

- the form loads on the public page
- form validation works
- feedback is saved in MongoDB
- Gemini analysis runs
- admin can log in
- dashboard loads feedback correctly

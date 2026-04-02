import dotenv from "dotenv";

dotenv.config();

const mongoUri = process.env.MONGO_URI;
const geminiApiKey = process.env.GEMINI_API_KEY;
const jwtSecret = process.env.JWT_SECRET;
const adminEmail = process.env.ADMIN_EMAIL;
const adminPassword = process.env.ADMIN_PASSWORD;

if (!mongoUri) {
  throw new Error("MONGO_URI is required in backend/.env");
}

if (!geminiApiKey) {
  throw new Error("GEMINI_API_KEY is required in backend/.env");
}

if (!jwtSecret) {
  throw new Error("JWT_SECRET is required in backend/.env");
}

function parseBoolean(value: string | undefined, fallback: boolean) {
  if (value === undefined) {
    return fallback;
  }

  return value.trim().toLowerCase() === "true";
}

function parseBoundedInteger(value: string | undefined, fallback: number, min: number, max: number) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    return fallback;
  }

  return parsed;
}

const env = {
  port: Number(process.env.PORT || 4000),
  clientUrl: process.env.CLIENT_URL || "http://localhost:3000",
  mongoUri,
  geminiApiKey,
  jwtSecret,
  adminEmail,
  adminPassword,
  weeklySummaryEnabled: parseBoolean(process.env.WEEKLY_SUMMARY_ENABLED, true),
  weeklySummaryDay: parseBoundedInteger(process.env.WEEKLY_SUMMARY_DAY, 1, 0, 6),
  weeklySummaryHour: parseBoundedInteger(process.env.WEEKLY_SUMMARY_HOUR, 9, 0, 23),
  weeklySummaryMinute: parseBoundedInteger(process.env.WEEKLY_SUMMARY_MINUTE, 0, 0, 59),
};

export { env };

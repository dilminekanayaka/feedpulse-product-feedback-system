import dotenv from "dotenv";

dotenv.config();

const mongoUri = process.env.MONGO_URI;
const jwtSecret = process.env.JWT_SECRET;
const adminEmail = process.env.ADMIN_EMAIL;
const adminPassword = process.env.ADMIN_PASSWORD;

if (!mongoUri) {
  throw new Error("MONGO_URI is required in backend/.env");
}

if (!jwtSecret) {
  throw new Error("JWT_SECRET is required in backend/.env");
}

if (!adminEmail) {
  throw new Error("ADMIN_EMAIL is required in backend/.env");
}

if (!adminPassword) {
  throw new Error("ADMIN_PASSWORD is required in backend/.env");
}

const env = {
  port: Number(process.env.PORT || 4000),
  clientUrl: process.env.CLIENT_URL || "http://localhost:3000",
  mongoUri,
  jwtSecret,
  adminEmail,
  adminPassword,
};

export { env };

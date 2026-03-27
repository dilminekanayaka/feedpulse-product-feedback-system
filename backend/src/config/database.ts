import mongoose from "mongoose";

import { env } from "./env";

async function connectToDatabase() {
  await mongoose.connect(env.mongoUri);
  console.log("MongoDB connected successfully.");
}

export { connectToDatabase };

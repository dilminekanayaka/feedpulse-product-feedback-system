import { app } from "./app";
import { connectToDatabase } from "./config/database";
import { env } from "./config/env";

async function startServer() {
  try {
    await connectToDatabase();

    app.listen(env.port, () => {
      console.log(`FeedPulse backend listening on http://localhost:${env.port}`);
    });
  } catch (error) {
    console.error("Failed to start server.", error);
    process.exit(1);
  }
}

void startServer();

import { app } from "./app";
import { connectToDatabase } from "./config/database";
import { env } from "./config/env";
import { ensureAdminUser } from "./services/admin-user.service";
import { startWeeklySummaryScheduler } from "./services/weekly-summary.scheduler";

async function startServer() {
  try {
    await connectToDatabase();
    await ensureAdminUser();
    startWeeklySummaryScheduler();

    app.listen(env.port, () => {
      console.log(`FeedPulse backend listening on http://localhost:${env.port}`);
    });
  } catch (error) {
    console.error("Failed to start server.", error);
    process.exit(1);
  }
}

void startServer();

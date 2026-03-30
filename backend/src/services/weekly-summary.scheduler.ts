import { env } from "../config/env";
import { storeWeeklyFeedbackSummary } from "../services/feedback-summary.service";

const oneWeekInMs = 7 * 24 * 60 * 60 * 1000;

function getNextScheduledRun(now: Date, dayOfWeek: number, hour: number, minute: number) {
  const next = new Date(now);
  next.setSeconds(0, 0);
  next.setHours(hour, minute, 0, 0);

  const currentDay = now.getDay();
  let daysUntilTarget = dayOfWeek - currentDay;

  if (daysUntilTarget < 0) {
    daysUntilTarget += 7;
  }

  next.setDate(now.getDate() + daysUntilTarget);

  if (next <= now) {
    next.setDate(next.getDate() + 7);
  }

  return next;
}

function startWeeklySummaryScheduler() {
  if (!env.weeklySummaryEnabled) {
    console.log("Weekly feedback summary scheduler is disabled.");
    return;
  }

  const now = new Date();
  const firstRun = getNextScheduledRun(
    now,
    env.weeklySummaryDay,
    env.weeklySummaryHour,
    env.weeklySummaryMinute,
  );

  const initialDelay = firstRun.getTime() - now.getTime();

  const runJob = async () => {
    try {
      const snapshot = await storeWeeklyFeedbackSummary();
      console.log(
        `Weekly feedback summary generated successfully at ${snapshot.generatedAt.toISOString()}`,
      );
    } catch (error) {
      console.error("Weekly feedback summary generation failed.", error);
    }
  };

  console.log(`Weekly feedback summary scheduler armed for ${firstRun.toISOString()}`);

  setTimeout(() => {
    void runJob();
    setInterval(() => {
      void runJob();
    }, oneWeekInMs);
  }, initialDelay);
}

export { getNextScheduledRun, startWeeklySummaryScheduler };

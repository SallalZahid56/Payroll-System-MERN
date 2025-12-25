// server/src/utils/syncScheduler.ts
import { syncAllProjects } from "../controllers/adminController";

let running = false;

export const startSyncScheduler = (intervalMs = 2 * 60 * 1000) => {
  if (running) return;
  running = true;

  // Run immediately once then set interval
  (async () => {
    try {
      console.log("🔁 Running initial project sync...");
      await syncAllProjects();
    } catch (err) {
      console.error("Error running initial project sync:", err);
    }
  })();

  setInterval(async () => {
    try {
      console.log("🔁 Scheduled project sync starting...");
      await syncAllProjects();
    } catch (err) {
      console.error("Error during scheduled project sync:", err);
    }
  }, intervalMs);
};

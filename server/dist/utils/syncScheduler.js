"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startSyncScheduler = void 0;
// server/src/utils/syncScheduler.ts
const adminController_1 = require("../controllers/adminController");
let running = false;
const startSyncScheduler = (intervalMs = 2 * 60 * 1000) => {
    if (running)
        return;
    running = true;
    // Run immediately once then set interval
    (async () => {
        try {
            console.log("🔁 Running initial project sync...");
            await (0, adminController_1.syncAllProjects)();
        }
        catch (err) {
            console.error("Error running initial project sync:", err);
        }
    })();
    setInterval(async () => {
        try {
            console.log("🔁 Scheduled project sync starting...");
            await (0, adminController_1.syncAllProjects)();
        }
        catch (err) {
            console.error("Error during scheduled project sync:", err);
        }
    }, intervalMs);
};
exports.startSyncScheduler = startSyncScheduler;

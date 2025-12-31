import Project from "../models/Project"; // Mongoose model

export const startInactiveResetScheduler = (intervalMs = 3 * 60 * 1000) => {
  setInterval(async () => {
    try {
      const threshold = new Date(Date.now() - 3 * 60 * 1000); // 3 minutes ago
      const result = await Project.updateMany(
        { sheet_status: "In Work", last_opened: { $lt: threshold } },
        { sheet_status: "Not Started" }
      );
      console.log(`Inactive projects reset. Modified count: ${result.modifiedCount}`);
    } catch (err) {
      console.error("Error resetting inactive projects:", err);
    }
  }, intervalMs);
};

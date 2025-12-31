"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startInactiveResetScheduler = void 0;
const Project_1 = __importDefault(require("../models/Project")); // Mongoose model
const startInactiveResetScheduler = (intervalMs = 3 * 60 * 1000) => {
    setInterval(async () => {
        try {
            const threshold = new Date(Date.now() - 3 * 60 * 1000); // 3 minutes ago
            const result = await Project_1.default.updateMany({ sheet_status: "In Work", last_opened: { $lt: threshold } }, { sheet_status: "Not Started" });
            console.log(`Inactive projects reset. Modified count: ${result.modifiedCount}`);
        }
        catch (err) {
            console.error("Error resetting inactive projects:", err);
        }
    }, intervalMs);
};
exports.startInactiveResetScheduler = startInactiveResetScheduler;

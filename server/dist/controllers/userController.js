"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.submitProject = exports.getPendingAssignedProjects = void 0;
const Project_1 = __importDefault(require("../models/Project"));
/* ============================
   GET PENDING PROJECTS
   Assigned to Logged-in User
============================ */
const getPendingAssignedProjects = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Not logged in" });
        }
        // ✅ USE USER ID (not name)
        const loggedInUserId = req.user.id;
        const projects = await Project_1.default.find({
            assigned_to: {
                $regex: new RegExp(`(^|,\\s*)${loggedInUserId}(,|$)`),
            },
            status: "assigned", // or "pending" if needed
        }).sort({ createdAt: -1 });
        return res.json({ projects });
    }
    catch (error) {
        console.error("Error fetching assigned projects:", error);
        res.status(500).json({ message: "Server error" });
    }
};
exports.getPendingAssignedProjects = getPendingAssignedProjects;
/* ============================
   SUBMIT PROJECT
   Set status to "submitted"
============================ */
const submitProject = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Not logged in" });
        }
        const projectId = req.params.projectId;
        if (!projectId) {
            return res.status(400).json({ message: "Project ID is required." });
        }
        // ✅ Update project status to 'submitted' only if assigned to this user
        const project = await Project_1.default.findOne({
            _id: projectId,
            assigned_to: {
                $regex: new RegExp(`(^|,\\s*)${req.user.id}(,|$)`),
            },
        });
        if (!project) {
            return res.status(404).json({ message: "Project not found or not assigned to you." });
        }
        project.status = "submitted";
        project.updated_at = new Date();
        await project.save();
        return res.json({ success: true, message: "Project submitted successfully!" });
    }
    catch (error) {
        console.error("Error submitting project:", error);
        res.status(500).json({ message: "Server error" });
    }
};
exports.submitProject = submitProject;

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
        // Prefer matching by assigned_to_ids (stores IDs). Fall back to assigned_to (names) for older records.
        const loggedInUserId = req.user.id;
        const loggedInUserName = req.user.name;
        const idRegex = new RegExp(`(^|,\\s*)${loggedInUserId}(,|$)`);
        const nameRegex = new RegExp(`(^|,\\s*)${loggedInUserName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(,|$)`, "i");
        const projects = await Project_1.default.find({
            $and: [
                { status: "assigned" },
                {
                    $or: [
                        { assigned_to_ids: { $regex: idRegex } },
                        { assigned_to: { $regex: nameRegex } },
                    ],
                },
            ],
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
        const idRegex = new RegExp(`(^|,\\s*)${req.user.id}(,|$)`);
        const nameRegex = new RegExp(`(^|,\\s*)${req.user.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(,|$)`, "i");
        const project = await Project_1.default.findOne({
            _id: projectId,
            $or: [
                { assigned_to_ids: { $regex: idRegex } },
                { assigned_to: { $regex: nameRegex } },
            ],
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

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHourlyUnassignedProjectsForProfile = exports.getHourlyAssignedProjectsForProfile = exports.getUnassignedProjectsForProfile = exports.getAssignedProjectsForProfile = void 0;
const Project_1 = __importDefault(require("../models/Project"));
const getAssignedProjectsForProfile = async (req, res) => {
    try {
        const profileName = req.user?.name; // From JWT
        if (!profileName) {
            return res.status(401).json({ message: "Unauthorized: Profile not logged in" });
        }
        const projects = await Project_1.default.find({
            assigned_to: { $ne: null },
            status: "assigned",
            project_type: "fixed",
            profile_name: profileName, // ✅ filter by profile_name
        })
            .sort({ created_at: -1 })
            .lean();
        const parsedProjects = projects.map((p) => ({
            ...p,
            assigned_to_ids: p.assigned_to_ids
                ? p.assigned_to_ids.split(",").map((id) => id.trim())
                : [],
        }));
        return res.json({ success: true, projects: parsedProjects || [] });
    }
    catch (err) {
        console.error("❌ Error fetching profile assigned projects:", err);
        res.status(500).json({ success: false, message: err.message });
    }
};
exports.getAssignedProjectsForProfile = getAssignedProjectsForProfile;
const getUnassignedProjectsForProfile = async (req, res) => {
    try {
        const profileName = req.user?.name;
        if (!profileName) {
            return res.status(401).json({ message: "Unauthorized: Profile not logged in" });
        }
        const projects = await Project_1.default.find({
            assigned_to: { $in: [null, ""] },
            project_type: "fixed",
            profile_name: profileName, // ✅ filter by profile_name
        }).sort({ created_at: -1 });
        const parsedProjects = projects.map((p) => ({
            ...p._doc,
            assigned_to_ids: p.assigned_to_ids
                ? p.assigned_to_ids.split(",").map((id) => id.trim())
                : [],
        }));
        res.json({ success: true, projects: parsedProjects });
    }
    catch (err) {
        console.error("❌ Error fetching profile unassigned projects:", err);
        res.status(500).json({ success: false, message: err.message });
    }
};
exports.getUnassignedProjectsForProfile = getUnassignedProjectsForProfile;
const getHourlyAssignedProjectsForProfile = async (req, res) => {
    try {
        const profileName = req.user?.name;
        if (!profileName) {
            return res.status(401).json({ message: "Unauthorized: Profile not logged in" });
        }
        const projects = await Project_1.default.find({
            project_type: "hourly",
            status: "assigned",
            assigned_to: { $ne: null },
            profile_name: profileName, // ✅ filter by profile_name
        })
            .sort({ created_at: -1 })
            .lean();
        const parsedProjects = projects.map((p) => ({
            ...p,
            assigned_to_ids: p.assigned_to_ids
                ? p.assigned_to_ids.split(",").map((id) => id.trim())
                : [],
        }));
        return res.json({ success: true, projects: parsedProjects });
    }
    catch (err) {
        console.error("❌ Error fetching hourly assigned projects for profile:", err);
        return res.status(500).json({ success: false, message: err.message });
    }
};
exports.getHourlyAssignedProjectsForProfile = getHourlyAssignedProjectsForProfile;
const getHourlyUnassignedProjectsForProfile = async (req, res) => {
    try {
        const profileName = req.user?.name;
        if (!profileName) {
            return res.status(401).json({ message: "Unauthorized: Profile not logged in" });
        }
        const projects = await Project_1.default.find({
            assigned_to: { $in: [null, ""] },
            project_type: "hourly",
            profile_name: profileName, // ✅ filter by profile_name
        })
            .sort({ created_at: -1 })
            .lean();
        const parsedProjects = projects.map((p) => ({
            ...p,
            assigned_to_ids: p.assigned_to_ids
                ? p.assigned_to_ids.split(",").map((id) => id.trim())
                : [],
        }));
        res.json({ success: true, projects: parsedProjects });
    }
    catch (err) {
        console.error("❌ Error fetching hourly unassigned projects for profile:", err);
        res.status(500).json({ success: false, message: err.message });
    }
};
exports.getHourlyUnassignedProjectsForProfile = getHourlyUnassignedProjectsForProfile;

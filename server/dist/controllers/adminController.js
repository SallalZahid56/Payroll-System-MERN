"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getInfonavBwpPayroll = exports.getCompanyPayroll = exports.getCompanies = exports.getFilteredBWPProfilesPayroll = exports.getFilteredProfilesPayroll = exports.getAllProfilesPayroll = exports.getAllUsersPayroll = exports.getProfilePayroll = exports.getProfilesForDropDown = exports.getUserPayroll = exports.getUsersProfiles = exports.syncProjectDataController = exports.syncAllProjects = exports.writeProjectColumns = exports.updateProjectStatus = exports.getProjectDetails = exports.updateHourlyProject = exports.getHourlyAssignedProjects = exports.getHourlyUnassignedProjects = exports.updateProject = exports.getUnpricedAssignedProjects = exports.getUnpricedUnassignedProjects = exports.getAssignedProjects = exports.assignProject = exports.getUsersAndCoordinators = exports.getUnassignedProjects = exports.addHourlyProject = exports.getNextProjectValues = exports.getColumns = exports.getManagers = exports.getProfilesForForm = exports.addProject = exports.addUser = exports.updateUserRole = exports.deleteUser = exports.getUsers = void 0;
const Project_1 = __importDefault(require("../models/Project"));
const user_1 = __importDefault(require("../models/user"));
const column_1 = __importDefault(require("../models/column"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const googleSheets_1 = require("../config/googleSheets");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const mongoose_1 = __importDefault(require("mongoose"));
const db = mongoose_1.default.connection;
// Create a dynamic model for project_data collection
const ProjectData = mongoose_1.default.model("ProjectData", new mongoose_1.default.Schema({}, { strict: false, collection: "project_data" }));
/* -------------------- 🔹 Get Users with Pagination + Search -------------------- */
const getUsers = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = "" } = req.query;
        const pageNum = Number(page);
        const limitNum = Number(limit);
        // Search filter
        const searchFilter = {
            $or: [
                { name: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } },
                { role: { $regex: search, $options: "i" } },
            ],
        };
        // Fetch users with pagination
        const users = await user_1.default.find(search ? searchFilter : {})
            .skip((pageNum - 1) * limitNum)
            .limit(limitNum)
            .sort({ createdAt: -1 });
        // Count total users
        const totalUsers = await user_1.default.countDocuments(search ? searchFilter : {});
        res.json({
            success: true,
            users,
            totalUsers,
        });
    }
    catch (err) {
        console.error("❌ Error fetching users:", err);
        res.status(500).json({ success: false, message: "Failed to fetch users" });
    }
};
exports.getUsers = getUsers;
// ===========================
// DELETE USER
// ===========================
const deleteUser = async (req, res) => {
    try {
        const userId = req.params.id;
        const deleted = await user_1.default.findByIdAndDelete(userId);
        if (!deleted) {
            return res.status(404).json({ message: "User not found" });
        }
        res.status(200).json({ message: "User deleted successfully" });
    }
    catch (error) {
        res.status(500).json({ message: "Failed to delete user", error });
    }
};
exports.deleteUser = deleteUser;
// ===========================
// UPDATE USER ROLE
// ===========================
const updateUserRole = async (req, res) => {
    try {
        const userId = req.params.id;
        const { role } = req.body;
        const validRoles = ["admin", "user", "profile", "manager"];
        if (!validRoles.includes(role)) {
            return res.status(400).json({ message: "Invalid role" });
        }
        const updatedUser = await user_1.default.findByIdAndUpdate(userId, { role }, { new: true });
        if (!updatedUser) {
            return res.status(404).json({ message: "User not found" });
        }
        // ⭐ Return new JWT with updated role
        const token = jsonwebtoken_1.default.sign({
            id: updatedUser._id,
            name: updatedUser.name,
            role: updatedUser.role,
        }, process.env.JWT_SECRET, { expiresIn: "7d" });
        res.status(200).json({
            message: "Role updated successfully",
            user: updatedUser,
            token, // Return the updated token
        });
    }
    catch (error) {
        res.status(500).json({ message: "Failed to update role", error });
    }
};
exports.updateUserRole = updateUserRole;
// ===========================
// Add a new user
// ===========================
const addUser = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        if (!name || !email || !password || !role) {
            return res.status(400).json({ message: "All fields are required" });
        }
        const validRoles = ["admin", "user", "profile", "manager"];
        if (!validRoles.includes(role.toLowerCase())) {
            return res.status(400).json({ message: "Invalid role" });
        }
        // Check if email already exists
        const existingUser = await user_1.default.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "Email already exists" });
        }
        // Hash password
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        const newUser = new user_1.default({
            name,
            email,
            password: hashedPassword,
            role: role.toLowerCase(),
        });
        await newUser.save();
        res.status(201).json({ message: "User added successfully", user: newUser });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to add user", error });
    }
};
exports.addUser = addUser;
/* -------------------- 🔹 Add Project -------------------- */
const addProject = async (req, res) => {
    try {
        const data = req.body;
        // Required fields in camelCase from frontend
        const required = [
            "projectId",
            "projectName",
            "profileName",
            "sheetName",
            "shift",
            "fixedOption",
            "workType",
            "company",
        ];
        // Validate required fields
        for (const field of required) {
            if (!data[field]) {
                return res
                    .status(400)
                    .json({ success: false, message: `${field} is required.` });
            }
        }
        // Check Lumpsum price
        if (data.fixedOption === "Lumpsum" && !data.lumpsumPrice) {
            return res
                .status(400)
                .json({ success: false, message: "Lumpsum price is required." });
        }
        // Convert arrays to strings if needed
        const shiftString = Array.isArray(data.shift) ? data.shift.join(", ") : data.shift;
        const projectColumnsString = Array.isArray(data.projectColumns)
            ? data.projectColumns.join(", ")
            : data.projectColumns || "";
        // Map camelCase to snake_case for Mongoose schema
        const projectData = {
            project_id: data.projectId,
            project_name: data.projectName,
            profile_name: data.profileName,
            sheet_name: data.sheetName,
            shift: shiftString,
            fixed_option: data.fixedOption,
            work_type: data.workType,
            company: data.company,
            project_type: data.projectType || "fixed", // ✅ Make sure project_type is set
            lumpsum_price: data.lumpsumPrice || null,
            instructions: data.instructions || "",
            project_columns: projectColumnsString,
            google_sheet_url: data.googleSheetUrl || "",
            price_worker_one: data.priceWorkerOne || 0,
            price_worker_two: data.priceWorkerTwo || 0,
            price_worker_three: data.priceWorkerThree || 0,
            price_worker_four: data.priceWorkerFour || 0,
            price_worker_five: data.priceWorkerFive || 0,
            total_entries: data.totalEntries || 0,
            profile_price_per_entry: data.profilePricePerEntry || 0,
            deadline: data.deadline ? new Date(data.deadline) : null,
        };
        const newProject = new Project_1.default(projectData);
        await newProject.save();
        res.status(201).json({
            success: true,
            message: "Project added successfully!",
            project: newProject,
        });
    }
    catch (err) {
        console.error("❌ Error adding project:", err);
        res.status(500).json({ success: false, message: err.message });
    }
};
exports.addProject = addProject;
/* -------------------- 🔹 Get Profiles for Form -------------------- */
const getProfilesForForm = async (_req, res) => {
    try {
        const profiles = await user_1.default.find({ role: "profile" }, "_id name");
        res.json({ success: true, profiles });
    }
    catch (err) {
        console.error("❌ Error fetching profiles:", err);
        res.status(500).json({ success: false, message: err.message });
    }
};
exports.getProfilesForForm = getProfilesForForm;
/* -------------------- 🔹 Get Managers -------------------- */
const getManagers = async (_req, res) => {
    try {
        const managers = await user_1.default.find({ role: "manager" }, "_id name");
        res.json({ success: true, managers });
    }
    catch (err) {
        console.error("❌ Error fetching managers:", err);
        res.status(500).json({ success: false, message: err.message });
    }
};
exports.getManagers = getManagers;
/* -------------------- 🔹 Get Columns -------------------- */
const getColumns = async (_req, res) => {
    try {
        const columns = await column_1.default.find({}, "_id name");
        res.json({ success: true, columns });
    }
    catch (err) {
        console.error("❌ Error fetching columns:", err);
        res.status(500).json({ success: false, message: err.message });
    }
};
exports.getColumns = getColumns;
/* -------------------- 🔹 Get Next Project Values -------------------- */
const getNextProjectValues = async (_req, res) => {
    try {
        const latest = await Project_1.default.findOne().sort({ created_at: -1 });
        let nextNumber = 1;
        if (latest?.project_name) { // ✅ matches schema
            const match = latest.project_name.match(/Project-(\d+)/);
            if (match) {
                nextNumber = parseInt(match[1]) + 1;
            }
        }
        const nextProjectId = `PROJ-${String(nextNumber).padStart(3, "0")}`;
        const nextProjectName = `Project-${nextNumber}`;
        res.json({
            success: true,
            nextProjectId,
            nextProjectName,
        });
    }
    catch (err) {
        console.error("❌ Error generating next project values:", err);
        res.status(500).json({ success: false, message: err.message });
    }
};
exports.getNextProjectValues = getNextProjectValues;
/* -------------------- 🔹 Add Hourly Project -------------------- */
const addHourlyProject = async (req, res) => {
    try {
        const data = req.body;
        // Required fields
        const required = [
            "projectId",
            "projectName",
            "profileName",
            "sheetName",
            "totalEntries",
            "projectType",
            "pricePerHour",
            "workType",
            "shift",
            "company",
        ];
        for (const field of required) {
            if (!data[field]) {
                return res
                    .status(400)
                    .json({ success: false, message: `${field} is required.` });
            }
        }
        // Convert arrays to strings
        const shiftString = Array.isArray(data.shift)
            ? data.shift.join(", ")
            : data.shift;
        const projectColumnsString = Array.isArray(data.projectColumns)
            ? data.projectColumns.join(", ")
            : data.projectColumns || "";
        // Map camelCase to snake_case for Mongoose schema
        const projectData = {
            project_id: data.projectId,
            project_name: data.projectName,
            profile_name: data.profileName,
            sheet_name: data.sheetName,
            total_entries: data.totalEntries,
            project_type: data.projectType || "hourly",
            price_per_hour: data.pricePerHour,
            work_type: data.workType,
            shift: shiftString,
            instructions: data.instructions || "",
            project_columns: projectColumnsString,
            company: data.company,
            google_sheet_url: data.googleSheetUrl || "",
        };
        const newProject = new Project_1.default(projectData);
        await newProject.save();
        res.status(201).json({
            success: true,
            message: "Hourly project added successfully!",
            project: newProject,
        });
    }
    catch (err) {
        console.error("❌ Error adding hourly project:", err);
        res.status(500).json({ success: false, message: err.message });
    }
};
exports.addHourlyProject = addHourlyProject;
/* -------------------- 🔹 Get All Unassigned Projects -------------------- */
const getUnassignedProjects = async (_req, res) => {
    try {
        const projects = await Project_1.default.find({
            assigned_to: { $in: [null, ""] },
            project_type: "fixed",
            status: "pending",
            $or: [
                {
                    $and: [
                        { lumpsum_price: { $ne: null } },
                        { profile_price_per_entry: { $ne: null } },
                    ],
                },
                {
                    $and: [
                        {
                            $or: [
                                { price_worker_one: { $ne: null } },
                                { price_worker_two: { $ne: null } },
                                { price_worker_three: { $ne: null } },
                                { price_worker_four: { $ne: null } },
                                { price_worker_five: { $ne: null } },
                            ],
                        },
                        { profile_price_per_entry: { $ne: null } },
                    ],
                },
            ],
        }).sort({ created_at: 1 });
        if (!projects || projects.length === 0) {
            return res.status(404).json({ success: false, message: "No projects found" });
        }
        res.json({ success: true, projects });
    }
    catch (error) {
        console.error("❌ Error fetching projects:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getUnassignedProjects = getUnassignedProjects;
/* -------------------- 🔹 Get Users and Coordinators -------------------- */
const getUsersAndCoordinators = async (_req, res) => {
    try {
        const users = await user_1.default.find({ role: "user" }, "_id name email");
        const coordinators = await user_1.default.find({ role: "coordinator" }, "_id name email");
        res.json({ success: true, users, coordinators });
    }
    catch (err) {
        console.error("❌ Error fetching users/coordinators:", err);
        res.status(500).json({ success: false, message: err.message });
    }
};
exports.getUsersAndCoordinators = getUsersAndCoordinators;
/* -------------------- 🔹 Assign Project -------------------- */
const assignProject = async (req, res) => {
    try {
        const { projectId, assignedUsers, assignedCoordinators } = req.body;
        if (!projectId) {
            return res.status(400).json({ success: false, message: "Project ID required." });
        }
        // Convert arrays to strings for storage (IDs)
        const assigned_to_ids = (assignedUsers || []).join(",");
        const assigned_to_coordinators = (assignedCoordinators || []).join(",");
        // Save the first assigned user name (or coordinator if no user)
        const assigned_to = (assignedUsers && assignedUsers.length > 0)
            ? assignedUsers[0] // first user name
            : (assignedCoordinators && assignedCoordinators.length > 0 ? assignedCoordinators[0] : null);
        await Project_1.default.findByIdAndUpdate(projectId, {
            assigned_to_ids,
            assigned_to_coordinators,
            assigned_to, // now stores actual user/coordinator name
            status: (assigned_to ? "assigned" : "pending"),
            updated_at: new Date(),
        });
        res.json({ success: true, message: "Project assigned successfully!" });
    }
    catch (err) {
        console.error("❌ Error assigning project:", err);
        res.status(500).json({ success: false, message: err.message });
    }
};
exports.assignProject = assignProject;
/* -------------------- 🔹 Get Assigned Projects -------------------- */
/* -------------------- 🔹 Get Assigned Projects -------------------- */
const getAssignedProjects = async (_req, res) => {
    try {
        const projects = await Project_1.default.find({
            // Must be assigned
            assigned_to: { $nin: ["", null] },
            // Must be fixed project
            project_type: "fixed",
            // Must be assigned
            status: "assigned",
            // Pricing conditions (same as your SQL)
            $or: [
                // Condition 1: Both Lumpsum + PPE present
                {
                    lumpsum_price: { $nin: [null, ""] },
                    profile_price_per_entry: { $nin: [null, ""] },
                },
                // Condition 2: any worker price present + PPE present
                {
                    profile_price_per_entry: { $nin: [null, ""] },
                    $or: [
                        { price_worker_one: { $nin: [null, ""] } },
                        { price_worker_two: { $nin: [null, ""] } },
                        { price_worker_three: { $nin: [null, ""] } },
                        { price_worker_four: { $nin: [null, ""] } },
                        { price_worker_five: { $nin: [null, ""] } },
                    ]
                }
            ]
        }).sort({ created_at: -1 });
        res.json({ success: true, projects });
    }
    catch (err) {
        console.error("❌ Error fetching assigned projects:", err);
        res.status(500).json({ success: false, message: err.message });
    }
};
exports.getAssignedProjects = getAssignedProjects;
// Unpriced Unassigned Project
const getUnpricedUnassignedProjects = async (_req, res) => {
    try {
        const projects = await Project_1.default.find({
            // FIXED: assigned_to is empty string ("")
            assigned_to: "",
            project_type: "fixed",
            status: "pending",
            $or: [
                // Condition 1: lumpsum is null AND PPE is null
                {
                    lumpsum_price: null,
                    profile_price_per_entry: null,
                },
                // Condition 2: all worker prices null AND PPE null
                {
                    price_worker_one: null,
                    price_worker_two: null,
                    price_worker_three: null,
                    price_worker_four: null,
                    price_worker_five: null,
                    profile_price_per_entry: null,
                }
            ],
        }).sort({ created_at: -1 });
        res.json({ success: true, projects });
    }
    catch (err) {
        console.error("❌ Error fetching unpriced unassigned projects:", err);
        res.status(500).json({ success: false, message: err.message });
    }
};
exports.getUnpricedUnassignedProjects = getUnpricedUnassignedProjects;
// ----------------------------
// Get Unpriced Assigned Projects
// ----------------------------
const getUnpricedAssignedProjects = async (_req, res) => {
    try {
        const projects = await Project_1.default.find({
            assigned_to: { $nin: ["", null] }, // must be assigned
            project_type: "fixed",
            status: "assigned",
            $or: [
                // Condition 1: lumpsum and PPE null
                { lumpsum_price: null, profile_price_per_entry: null },
                // Condition 2: all worker prices null AND PPE null
                {
                    price_worker_one: null,
                    price_worker_two: null,
                    price_worker_three: null,
                    price_worker_four: null,
                    price_worker_five: null,
                    profile_price_per_entry: null,
                },
            ],
        }).sort({ created_at: -1 });
        res.json({ success: true, projects });
    }
    catch (err) {
        console.error("❌ Error fetching unpriced assigned projects:", err);
        res.status(500).json({ success: false, message: err.message });
    }
};
exports.getUnpricedAssignedProjects = getUnpricedAssignedProjects;
/* -------------------- 🔹 Update project after editing -------------------- */
const updateProject = async (req, res) => {
    try {
        const updatedProject = await Project_1.default.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json({ success: true, project: updatedProject });
    }
    catch (err) {
        console.error("Error updating project:", err);
        res.status(500).json({ success: false, message: "Error updating project" });
    }
};
exports.updateProject = updateProject;
/* -------------------- 🔹 Get All Hourly Unassigned Projects -------------------- */
const getHourlyUnassignedProjects = async (_req, res) => {
    try {
        const projects = await Project_1.default.find({
            assigned_to: { $in: [null, ""] }, // 🔥 unassigned
            status: "pending", // 🔥 only pending
            project_type: "hourly", // 🔥 only hourly
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
        console.error("❌ Error fetching hourly unassigned projects (ADMIN):", err);
        res.status(500).json({ success: false, message: err.message });
    }
};
exports.getHourlyUnassignedProjects = getHourlyUnassignedProjects;
/* -------------------- 🔹 Get Hourly Assigned Projects -------------------- */
const getHourlyAssignedProjects = async (_req, res) => {
    try {
        const projects = await Project_1.default.find({
            assigned_to: { $nin: ["", null] }, // assigned
            project_type: "hourly",
            status: "assigned",
            price_per_hour: { $ne: null },
        }).sort({ created_at: -1 });
        res.json({ success: true, projects });
    }
    catch (err) {
        console.error("❌ Error fetching hourly assigned projects:", err);
        res.status(500).json({ success: false, message: err.message });
    }
};
exports.getHourlyAssignedProjects = getHourlyAssignedProjects;
/* -------------------- 🔹 Update Hourly Project -------------------- */
const updateHourlyProject = async (req, res) => {
    try {
        const projectId = req.params.id;
        const allowedFields = ["project_name", "profile_name", "sheet_name", "project_type", "price_per_hour"];
        const updateData = {};
        // Only allow updating these fields
        for (const key of allowedFields) {
            if (req.body[key] !== undefined) {
                updateData[key] = req.body[key];
            }
        }
        const updatedProject = await Project_1.default.findByIdAndUpdate(projectId, updateData, { new: true });
        if (!updatedProject) {
            return res.status(404).json({ success: false, message: "Hourly project not found." });
        }
        res.json({ success: true, project: updatedProject });
    }
    catch (err) {
        console.error("❌ Error updating hourly project:", err);
        res.status(500).json({ success: false, message: "Error updating hourly project" });
    }
};
exports.updateHourlyProject = updateHourlyProject;
// Get project details for Go to Project button
const getProjectDetails = async (req, res) => {
    const { projectId } = req.params;
    try {
        const project = await Project_1.default.findOne({ project_id: projectId }).lean();
        if (!project) {
            return res.status(404).json({ success: false, message: "Project not found." });
        }
        res.json({
            success: true,
            googleSheetUrl: project.google_sheet_url,
            is_file_based: project.is_file_based,
            project_type: project.project_type,
            work_type: project.work_type,
            fixed_option: project.fixed_option,
            project_columns: project.project_columns
                ? project.project_columns.split(", ")
                : [],
        });
    }
    catch (error) {
        console.error("Error fetching project details:", error);
        res.status(500).json({ success: false, message: "Database error." });
    }
};
exports.getProjectDetails = getProjectDetails;
// Update project status when clicking Go to Project
const updateProjectStatus = async (req, res) => {
    const { projectId } = req.params;
    const { status } = req.body;
    if (!status) {
        return res.status(400).json({ success: false, message: "Status is required" });
    }
    try {
        const project = await Project_1.default.findOneAndUpdate({ project_id: projectId }, { sheet_status: status, last_opened: new Date() }, { new: true });
        if (!project) {
            return res.status(404).json({ success: false, message: "Project not found." });
        }
        res.json({ success: true, message: "Project status updated successfully" });
    }
    catch (error) {
        console.error("Error updating project status:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};
exports.updateProjectStatus = updateProjectStatus;
// For go to project button to write columns
const writeProjectColumns = async (req, res) => {
    try {
        const projectId = req.params.projectId;
        // Fetch project
        const project = await Project_1.default.findOne({ project_id: projectId });
        if (!project) {
            return res.status(404).json({ success: false, message: "Project not found." });
        }
        if (!project.google_sheet_url) {
            return res.status(400).json({ success: false, message: "Google Sheet URL missing." });
        }
        // Extract spreadsheet ID
        const spreadsheetId = project.google_sheet_url.split("/d/")[1]?.split("/")[0];
        if (!spreadsheetId) {
            return res.status(400).json({ success: false, message: "Invalid Google Sheet URL." });
        }
        const sheets = (0, googleSheets_1.getSheetsClient)();
        // Fetch all sheet metadata
        const sheetMeta = await sheets.spreadsheets.get({ spreadsheetId });
        const sheetsList = sheetMeta.data.sheets ?? [];
        const tabName = project.project_name?.trim() || "";
        const sheetObj = sheetsList.find((s) => s.properties?.title === tabName);
        // If tab not found → return error
        if (!sheetObj || !sheetObj.properties || sheetObj.properties.sheetId === undefined) {
            return res.status(400).json({
                success: false,
                message: `❌ Tab "${tabName}" not found in Google Sheet.`,
            });
        }
        const sheetId = sheetObj.properties.sheetId;
        // Only NON-file-based fixed projects allowed
        if (project.is_file_based) {
            return res.status(400).json({
                success: false,
                message: "File-based projects are not handled by this API.",
            });
        }
        if (project.project_type !== "fixed") {
            return res.status(400).json({
                success: false,
                message: "Only fixed-type projects are handled.",
            });
        }
        // ----------------------- NORMALIZATION HELPER -----------------------
        const normalize = (str) => str.trim().toLowerCase();
        // ----------------------- WORKER COLUMN MAP -----------------------
        const workerMap = {
            "Single Entry": ["Worker"],
            "Double Entry": ["Worker One", "Worker Two"],
            "Triple Entry": ["Worker One", "Worker Two", "Worker Three"],
            "Four Entry": ["Worker One", "Worker Two", "Worker Three", "Worker Four"],
            "Fifth Entry": ["Worker One", "Worker Two", "Worker Three", "Worker Four", "Worker Five"],
        };
        const workerColumns = workerMap[project.fixed_option || ""] ?? [];
        // Read existing header
        const headerResp = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: `${tabName}!A1:BZ1`,
        });
        const existingHeader = headerResp.data.values?.[0] ?? [];
        const finalHeader = [...existingHeader];
        // Create lowercase version for comparison
        const finalHeaderNormalized = finalHeader.map((h) => normalize(h));
        // ----------------------- ADD MISSING WORKER COLUMNS -----------------------
        for (const col of workerColumns) {
            if (!finalHeaderNormalized.includes(normalize(col))) {
                finalHeader.push(col); // Add at the end
            }
        }
        // If headers already match (no change)
        if (JSON.stringify(existingHeader) === JSON.stringify(finalHeader)) {
            return res.json({
                success: true,
                message: "Header already aligned — no changes required.",
            });
        }
        // ----------------------- UPDATE ONLY HEADER ROW -----------------------
        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `${tabName}!A1`,
            valueInputOption: "RAW",
            requestBody: { values: [finalHeader] },
        });
        // ----------------------- STYLE HEADER ROW -----------------------
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            requestBody: {
                requests: [
                    {
                        repeatCell: {
                            range: { sheetId, startRowIndex: 0, endRowIndex: 1 },
                            cell: {
                                userEnteredFormat: {
                                    backgroundColor: { red: 0, green: 0, blue: 0 },
                                    textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 }, bold: true },
                                },
                            },
                            fields: "userEnteredFormat(backgroundColor,textFormat)",
                        },
                    },
                ],
            },
        });
        return res.json({
            success: true,
            message: `✅ Sheet "${tabName}" is ready — worker columns ensured.`,
        });
    }
    catch (err) {
        console.error("❌ Error in writeProjectColumns:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error while writing to sheet.",
        });
    }
};
exports.writeProjectColumns = writeProjectColumns;
// server/src/controllers/adminController.ts
// ----------------- Sync service: syncAllProjects -----------------
const syncAllProjects = async () => {
    try {
        const sheetsClient = (0, googleSheets_1.getSheetsClient)();
        // Find projects that are "In Work" in sheet_status (matches your MySQL logic)
        const inWorkProjects = await Project_1.default.find({ sheet_status: "In Work" }).select("project_id project_name google_sheet_url").lean();
        if (!inWorkProjects || inWorkProjects.length === 0) {
            console.log("⚠️ No active projects found for sync.");
            return { success: false, message: "No active projects found." };
        }
        for (const proj of inWorkProjects) {
            const { project_id, google_sheet_url, project_name } = proj;
            if (!google_sheet_url) {
                console.log(`⚠️ Project ${project_id} has no google_sheet_url — skipping.`);
                continue;
            }
            console.log(`📂 Processing project: ${project_id} (${project_name})`);
            // extract spreadsheetId
            const spreadsheetId = (google_sheet_url || "").split("/d/")[1]?.split("/")[0];
            if (!spreadsheetId) {
                console.log(`⚠️ Invalid sheet URL for project ${project_id}. Skipping.`);
                continue;
            }
            // Get sheet metadata
            const sheetMeta = await sheetsClient.spreadsheets.get({ spreadsheetId });
            const sheetsList = sheetMeta.data.sheets || [];
            const tabNames = sheetsList.map((s) => s?.properties?.title || "");
            // Normalize
            const normalizedProjectName = (project_name || "").trim().toLowerCase();
            // Find matching tab by normalized name (case-insensitive trim)
            const matchedTab = tabNames.find((name) => (name || "").trim().toLowerCase() === normalizedProjectName);
            if (!matchedTab) {
                console.log(`⚠️ Skipping project ${project_id}: No tab found matching project name "${project_name}".`);
                continue;
            }
            console.log(`📑 Found matching tab: ${matchedTab}`);
            // Read full area (header + rows)
            const sheetResponse = await sheetsClient.spreadsheets.values.get({
                spreadsheetId,
                range: `${matchedTab}!A1:BZ100000`,
            });
            const sheetData = sheetResponse.data.values || [];
            const sheetHeaders = sheetData[0] || [];
            const sheetRows = sheetData.slice(1);
            console.log(`📊 [${matchedTab}] Sheet has ${sheetRows.length} rows.`);
            // Get existing saved data from MongoDB
            const existing = await ProjectData.findOne({ project_id }).lean();
            let dbDataArray = [];
            if (existing && Array.isArray(existing.row_data) && existing.row_data.length > 0) {
                dbDataArray = existing.row_data;
            }
            const dbHeaders = dbDataArray[0] || [];
            const dbRows = dbDataArray.slice(1);
            // Compare — count changes
            let changesFound = 0;
            const maxRows = Math.max(sheetRows.length, dbRows.length);
            for (let i = 0; i < maxRows; i++) {
                const sheetRow = sheetRows[i] || [];
                const dbRow = dbRows[i] || [];
                const maxCols = Math.max(sheetRow.length, dbRow.length);
                for (let j = 0; j < maxCols; j++) {
                    const sheetCell = sheetRow[j] ?? "";
                    const dbCell = dbRow[j] ?? "";
                    if (String(sheetCell) !== String(dbCell)) {
                        changesFound++;
                    }
                }
            }
            if (Array.isArray(sheetHeaders) && Array.isArray(dbHeaders) && sheetHeaders.join() !== dbHeaders.join()) {
                changesFound++; // header difference
            }
            if (!existing || changesFound > 0) {
                const finalDataToSave = [sheetHeaders, ...sheetRows];
                // Upsert into ProjectData
                await ProjectData.findOneAndUpdate({ project_id }, { project_id, row_data: finalDataToSave, updated_at: new Date() }, { upsert: true, new: true, setDefaultsOnInsert: true });
                console.log(`💾 DB updated for project ${project_id}. Detected ${changesFound} changed cell(s).`);
            }
            else {
                console.log(`✅ No changes for project ${project_id}. DB is in sync.`);
            }
        }
        console.log("✅ Project data sync completed.");
        return { success: true, message: "Project data synchronized successfully." };
    }
    catch (err) {
        console.error("❌ Error syncing project data:", err);
        return { success: false, message: "Failed to sync project data." };
    }
};
exports.syncAllProjects = syncAllProjects;
// Express controller wrapper
const syncProjectDataController = async (req, res) => {
    const result = await (0, exports.syncAllProjects)();
    if (result.success)
        return res.json({ success: true, message: result.message });
    return res.status(500).json({ success: false, message: result.message });
};
exports.syncProjectDataController = syncProjectDataController;
// GET ALL USERS EXCEPT ADMIN
const getUsersProfiles = async (req, res) => {
    try {
        const collection = db.collection("users");
        const users = await collection
            .find({
            role: { $in: ["user", "cordinator", "manager"] }
        })
            .project({ _id: 1, name: 1, role: 1 })
            .toArray();
        if (!users.length) {
            return res.status(404).json({ success: false, message: "No users found." });
        }
        res.json({ success: true, users });
    }
    catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({ success: false, message: "Database error." });
    }
};
exports.getUsersProfiles = getUsersProfiles;
// This is for user payroll
const getUserPayroll = async (req, res) => {
    try {
        const selectedUsername = (req.params.username || "").trim();
        const { start_date, end_date } = req.query;
        if (!selectedUsername) {
            return res.status(400).json({
                success: false,
                message: "Username not provided.",
            });
        }
        if (!start_date || !end_date) {
            return res.status(400).json({
                success: false,
                message: "Start date and end date are required.",
            });
        }
        // ---------------------
        // Convert dates, set end-of-day
        // ---------------------
        const start = new Date(start_date);
        const end = new Date(end_date);
        end.setHours(23, 59, 59, 999);
        // ---------------------
        // Collections
        // ---------------------
        const Projects = db.collection("projects");
        const Hourly = db.collection("hourlyprojectrecords");
        // ---------------------
        // FIXED SALARY PIPELINE
        // ---------------------
        const fixedPipeline = [
            {
                $match: {
                    status: "completed",
                    $or: [
                        { updated_at: { $gte: start, $lte: end } },
                        { original_completed_at: { $gte: start, $lte: end } }
                    ]
                }
            },
            {
                $lookup: {
                    from: "workersalaries",
                    localField: "project_id",
                    foreignField: "project_id",
                    as: "ws"
                }
            },
            { $unwind: "$ws" },
            {
                // Case-insensitive username match
                $match: { "ws.worker_name": { $regex: `^${selectedUsername}$`, $options: "i" } }
            },
            {
                $lookup: {
                    from: "revised_worker_salaries",
                    let: { pid: "$project_id", wname: "$ws.worker_name" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$project_id", "$$pid"] },
                                        { $eq: ["$worker_name", "$$wname"] }
                                    ]
                                }
                            }
                        }
                    ],
                    as: "rws"
                }
            },
            { $unwind: { path: "$rws", preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    project_id: 1,
                    project_name: 1,
                    user_name: "$ws.worker_name",
                    price_worker_one: 1,
                    fixed_option: 1,
                    sheet_name: 1,
                    profile_name: 1,
                    salary: "$ws.salary",
                    no_of_entries: "$ws.no_of_entries",
                    revised_salary: "$rws.revised_salary",
                    revised_entries: "$rws.no_of_entries",
                    company: 1,
                    type: { $literal: "Fixed" }
                }
            }
        ];
        const fixedResults = await Projects.aggregate(fixedPipeline).toArray();
        // ---------------------
        // HOURLY SALARY PIPELINE
        // ---------------------
        const hourlyPipeline = [
            {
                $match: {
                    worker_name: { $regex: `^${selectedUsername}$`, $options: "i" }
                }
            },
            {
                $lookup: {
                    from: "projects",
                    localField: "project_id",
                    foreignField: "project_id",
                    as: "proj"
                }
            },
            { $unwind: "$proj" },
            {
                $match: {
                    "proj.updated_at": { $gte: start, $lte: end }
                }
            },
            {
                $project: {
                    project_id: 1,
                    project_name: "$proj.project_name",
                    user_name: "$worker_name",
                    salary: 1,
                    no_of_entries: { $round: [{ $divide: ["$salary", 120] }, 2] },
                    company: "$proj.company",
                    profile_name: "$proj.profile_name",
                    sheet_name: { $literal: "Hourly Project" },
                    type: { $literal: "Hourly" }
                }
            }
        ];
        const hourlyResults = await Hourly.aggregate(hourlyPipeline).toArray();
        // ---------------------
        // Combine results
        // ---------------------
        const combinedResults = [...fixedResults, ...hourlyResults];
        if (combinedResults.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No payroll data available for the selected user within the selected dates."
            });
        }
        res.json({ success: true, data: combinedResults });
    }
    catch (error) {
        console.error("Error fetching payroll data:", error);
        return res.status(500).json({
            success: false,
            message: "Server error."
        });
    }
};
exports.getUserPayroll = getUserPayroll;
// -------------------- 🔹 Fetch only profiles for the dropdown --------------------
const getProfilesForDropDown = async (req, res) => {
    try {
        const collection = db.collection("users");
        const profiles = await collection
            .find({ role: "profile" })
            .project({ _id: 1, name: 1, role: 1 })
            .toArray();
        if (!profiles.length) {
            return res.status(404).json({ success: false, message: "No profiles found." });
        }
        res.json({ success: true, profiles });
    }
    catch (err) {
        console.error("Error fetching profiles:", err);
        res.status(500).json({ success: false, message: "Database error." });
    }
};
exports.getProfilesForDropDown = getProfilesForDropDown;
// -------------------- 🔹 Fetch individual profile payroll --------------------
const getProfilePayroll = async (req, res) => {
    try {
        const profileName = (req.params.profileName || "").trim();
        const { start_date, end_date } = req.query;
        if (!profileName) {
            return res.status(400).json({ success: false, message: "Profile name not provided." });
        }
        if (!start_date || !end_date) {
            return res.status(400).json({ success: false, message: "Start date and end date are required." });
        }
        const start = new Date(start_date);
        const end = new Date(end_date);
        end.setHours(23, 59, 59, 999);
        const Projects = db.collection("projects");
        const Hourly = db.collection("hourlyprojectrecords");
        const WorkerSalaries = db.collection("workersalaries");
        // ---------------- Fixed Project Payroll ----------------
        const fixedPipeline = [
            { $match: { status: "completed", profile_name: profileName, updated_at: { $gte: start, $lte: end } } },
            { $lookup: { from: "workersalaries", localField: "project_id", foreignField: "project_id", as: "ws" } },
            { $unwind: "$ws" },
            {
                $group: {
                    _id: "$project_id",
                    project_id: { $first: "$project_id" },
                    project_name: { $first: "$project_name" },
                    profile_name: { $first: "$profile_name" },
                    sheet_name: { $first: "$sheet_name" },
                    price_worker_one: { $first: "$price_worker_one" },
                    profile_debit: { $first: "$ws.profile_debit" }, // NO SUM
                    no_of_entries: { $sum: "$ws.no_of_entries" },
                    company: { $first: "$company" },
                    type: { $first: "Fixed" },
                },
            },
            { $sort: { project_id: 1 } },
        ];
        const fixedResults = await Projects.aggregate(fixedPipeline).toArray();
        // ---------------- Hourly Project Payroll ----------------
        const hourlyPipeline = [
            { $match: { profile_name: profileName, updated_at: { $gte: start, $lte: end } } },
            { $lookup: { from: "projects", localField: "project_id", foreignField: "project_id", as: "proj" } },
            { $unwind: "$proj" },
            {
                $group: {
                    _id: "$project_id",
                    project_id: { $first: "$project.project_id" },
                    project_name: { $first: "$project.project_name" },
                    profile_name: { $first: "$project.profile_name" },
                    sheet_name: { $first: "Hourly Project" },
                    price_per_hour: { $first: "$project.price_per_hour" },
                    profile_debit: { $first: "$profile_debit" }, // NO SUM
                    no_of_entries: { $sum: "$runned_hours" },
                    company: { $first: "$project.company" },
                    type: { $first: "Hourly" },
                },
            },
            { $sort: { project_id: 1 } },
        ];
        const hourlyResults = await Hourly.aggregate(hourlyPipeline).toArray();
        // ---------------- Combine Fixed + Hourly (unique project_id) ----------------
        const combinedMap = {};
        [...fixedResults, ...hourlyResults].forEach((item) => {
            if (!combinedMap[item.project_id])
                combinedMap[item.project_id] = item;
        });
        const combinedResults = Object.values(combinedMap);
        if (!combinedResults.length) {
            return res.status(404).json({ success: false, message: "No payroll data found for the selected profile." });
        }
        res.json({ success: true, data: combinedResults });
    }
    catch (err) {
        console.error("Error fetching profile payroll:", err);
        res.status(500).json({ success: false, message: "Server error." });
    }
};
exports.getProfilePayroll = getProfilePayroll;
// -------------------- 🔹 Fetch ALL USERS payroll --------------------
const getAllUsersPayroll = async (req, res) => {
    try {
        const { start_date, end_date } = req.query;
        if (!start_date || !end_date) {
            return res.status(400).json({
                success: false,
                message: "Start date and end date are required.",
            });
        }
        const start = new Date(start_date);
        const end = new Date(end_date);
        end.setHours(23, 59, 59, 999);
        const Projects = db.collection("projects");
        const HourlyRecords = db.collection("hourlyprojectrecords");
        /* ================= FIXED PAYROLL ================= */
        const fixedResults = await Projects.aggregate([
            {
                $match: {
                    status: "completed",
                    updated_at: { $gte: start, $lte: end },
                },
            },
            {
                $lookup: {
                    from: "workersalaries",
                    localField: "project_id",
                    foreignField: "project_id",
                    as: "ws",
                },
            },
            { $unwind: "$ws" },
            /* 🔹 Normalize numeric fields */
            {
                $addFields: {
                    price_worker_one_num: {
                        $convert: {
                            input: "$price_worker_one",
                            to: "double",
                            onError: null,
                            onNull: null,
                        },
                    },
                    ws_salary_num: {
                        $convert: {
                            input: "$ws.salary",
                            to: "double",
                            onError: 0,
                            onNull: 0,
                        },
                    },
                    ws_entries_num: {
                        $convert: {
                            input: "$ws.no_of_entries",
                            to: "double",
                            onError: 0,
                            onNull: 0,
                        },
                    },
                },
            },
            {
                $group: {
                    _id: "$ws.worker_name",
                    worker_name: { $first: "$ws.worker_name" },
                    fixed_salary: { $sum: "$ws_salary_num" },
                    fixed_entries: { $sum: "$ws_entries_num" },
                    rs_4_entries: {
                        $sum: {
                            $cond: [{ $eq: ["$price_worker_one_num", 4] }, "$ws_entries_num", 0],
                        },
                    },
                    rs_8_entries: {
                        $sum: {
                            $cond: [{ $eq: ["$price_worker_one_num", 8] }, "$ws_entries_num", 0],
                        },
                    },
                    rs_12_entries: {
                        $sum: {
                            $cond: [{ $eq: ["$price_worker_one_num", 12] }, "$ws_entries_num", 0],
                        },
                    },
                    rs_16_entries: {
                        $sum: {
                            $cond: [{ $eq: ["$price_worker_one_num", 16] }, "$ws_entries_num", 0],
                        },
                    },
                    other_entries: {
                        $sum: {
                            $cond: [
                                {
                                    $not: {
                                        $in: ["$price_worker_one_num", [4, 8, 12, 16]],
                                    },
                                },
                                "$ws_entries_num",
                                0,
                            ],
                        },
                    },
                },
            },
        ]).toArray();
        /* ================= HOURLY PAYROLL ================= */
        const hourlyResults = await HourlyRecords.aggregate([
            {
                $lookup: {
                    from: "projects",
                    localField: "project_id",
                    foreignField: "project_id",
                    as: "p",
                },
            },
            { $unwind: "$p" },
            /* 🔹 Filter using PROJECT date (important) */
            {
                $match: {
                    "p.updated_at": { $gte: start, $lte: end },
                },
            },
            {
                $addFields: {
                    salary_num: {
                        $convert: {
                            input: "$salary",
                            to: "double",
                            onError: 0,
                            onNull: 0,
                        },
                    },
                    hours_num: {
                        $convert: {
                            input: "$runned_hours",
                            to: "double",
                            onError: 0,
                            onNull: 0,
                        },
                    },
                },
            },
            {
                $group: {
                    _id: "$worker_name",
                    worker_name: { $first: "$worker_name" },
                    hourly_salary: { $sum: "$salary_num" },
                    hourly_entries: { $sum: "$hours_num" },
                },
            },
        ]).toArray();
        /* ================= COMBINE ================= */
        const payrollMap = new Map();
        fixedResults.forEach((r) => {
            payrollMap.set(r.worker_name, {
                worker_name: r.worker_name,
                fixed_salary: r.fixed_salary,
                fixed_entries: r.fixed_entries,
                hourly_salary: 0,
                hourly_entries: 0,
                rs_4_entries: r.rs_4_entries,
                rs_8_entries: r.rs_8_entries,
                rs_12_entries: r.rs_12_entries,
                rs_16_entries: r.rs_16_entries,
                other_entries: r.other_entries,
            });
        });
        hourlyResults.forEach((r) => {
            if (!payrollMap.has(r.worker_name)) {
                payrollMap.set(r.worker_name, {
                    worker_name: r.worker_name,
                    fixed_salary: 0,
                    fixed_entries: 0,
                    hourly_salary: r.hourly_salary,
                    hourly_entries: r.hourly_entries,
                    rs_4_entries: 0,
                    rs_8_entries: 0,
                    rs_12_entries: 0,
                    rs_16_entries: 0,
                    other_entries: 0,
                });
            }
            else {
                const e = payrollMap.get(r.worker_name);
                e.hourly_salary = r.hourly_salary;
                e.hourly_entries = r.hourly_entries;
            }
        });
        const finalResults = Array.from(payrollMap.values()).map((e) => ({
            ...e,
            total_entries: e.fixed_entries + e.hourly_entries,
            grand_total: e.fixed_salary + e.hourly_salary,
        }));
        res.json({ success: true, data: finalResults });
    }
    catch (err) {
        console.error("Error fetching all users payroll:", err);
        res.status(500).json({ success: false, message: "Server error." });
    }
};
exports.getAllUsersPayroll = getAllUsersPayroll;
// -------------------- 🔹 Fetch ALL PROFILES payroll --------------------
const getAllProfilesPayroll = async (req, res) => {
    try {
        const { start_date, end_date } = req.query;
        if (!start_date || !end_date) {
            return res.status(400).json({
                success: false,
                message: "Start date and end date are required.",
            });
        }
        const start = new Date(start_date);
        const end = new Date(end_date);
        end.setHours(23, 59, 59, 999);
        const Projects = db.collection("projects");
        const HourlyRecords = db.collection("hourlyprojectrecords");
        /* ================= FIXED PAYROLL ================= */
        const fixed = await Projects.aggregate([
            {
                $match: {
                    status: "completed",
                    updated_at: { $gte: start, $lte: end },
                },
            },
            {
                $lookup: {
                    from: "workersalaries",
                    localField: "project_id",
                    foreignField: "project_id",
                    as: "ws",
                },
            },
            { $unwind: "$ws" },
            /* 🔹 Normalize values */
            {
                $addFields: {
                    profile_debit_num: {
                        $convert: {
                            input: "$ws.profile_debit",
                            to: "double",
                            onError: 0,
                            onNull: 0,
                        },
                    },
                    entries_num: {
                        $convert: {
                            input: "$ws.no_of_entries",
                            to: "double",
                            onError: 0,
                            onNull: 0,
                        },
                    },
                },
            },
            /* 🔹 FIRST GROUP: profile + project (MYSQL EQUIVALENT) */
            {
                $group: {
                    _id: {
                        profile_name: "$profile_name",
                        project_id: "$project_id",
                    },
                    profile_name: { $first: "$profile_name" },
                    fixed_profile_debit: { $first: "$profile_debit_num" }, // ✅ ANY_VALUE
                    fixed_entries: { $sum: "$entries_num" },
                },
            },
            /* 🔹 SECOND GROUP: per profile */
            {
                $group: {
                    _id: "$profile_name",
                    profile_name: { $first: "$profile_name" },
                    fixed_profile_debit: { $sum: "$fixed_profile_debit" },
                    fixed_entries: { $sum: "$fixed_entries" },
                },
            },
        ]).toArray();
        /* ================= HOURLY PAYROLL ================= */
        const hourly = await HourlyRecords.aggregate([
            {
                $lookup: {
                    from: "projects",
                    localField: "project_id",
                    foreignField: "project_id",
                    as: "p",
                },
            },
            { $unwind: "$p" },
            {
                $match: {
                    "p.status": "completed",
                    "p.updated_at": { $gte: start, $lte: end },
                },
            },
            {
                $addFields: {
                    profile_debit_num: {
                        $convert: {
                            input: "$profile_debit",
                            to: "double",
                            onError: 0,
                            onNull: 0,
                        },
                    },
                    hours_num: {
                        $convert: {
                            input: "$runned_hours",
                            to: "double",
                            onError: 0,
                            onNull: 0,
                        },
                    },
                },
            },
            /* 🔹 FIRST GROUP: profile + project */
            {
                $group: {
                    _id: {
                        profile_name: "$p.profile_name",
                        project_id: "$project_id",
                    },
                    profile_name: { $first: "$p.profile_name" },
                    hourly_profile_debit: { $first: "$profile_debit_num" }, // ✅ ANY_VALUE
                    hourly_entries: { $sum: "$hours_num" },
                },
            },
            /* 🔹 SECOND GROUP: per profile */
            {
                $group: {
                    _id: "$profile_name",
                    profile_name: { $first: "$profile_name" },
                    hourly_profile_debit: { $sum: "$hourly_profile_debit" },
                    hourly_entries: { $sum: "$hourly_entries" },
                },
            },
        ]).toArray();
        /* ================= MERGE FIXED + HOURLY ================= */
        const map = new Map();
        fixed.forEach((f) => {
            map.set(f.profile_name, {
                profile_name: f.profile_name,
                fixed_profile_debit: f.fixed_profile_debit,
                hourly_profile_debit: 0,
                fixed_entries: f.fixed_entries,
                hourly_entries: 0,
            });
        });
        hourly.forEach((h) => {
            const e = map.get(h.profile_name) || {
                profile_name: h.profile_name,
                fixed_profile_debit: 0,
                fixed_entries: 0,
                hourly_profile_debit: 0,
                hourly_entries: 0,
            };
            e.hourly_profile_debit = h.hourly_profile_debit;
            e.hourly_entries = h.hourly_entries;
            map.set(h.profile_name, e);
        });
        /* ================= FINAL TOTALS ================= */
        const final = Array.from(map.values()).map((e) => ({
            ...e,
            total_profile_debit: e.fixed_profile_debit + e.hourly_profile_debit,
            total_entries: e.fixed_entries + e.hourly_entries,
        }));
        res.json({ success: true, data: final });
    }
    catch (err) {
        console.error("Profiles payroll error:", err);
        res.status(500).json({ success: false, message: "Server error" });
    }
};
exports.getAllProfilesPayroll = getAllProfilesPayroll;
// -------------------- 🔹 FILTERED PROFILES PAYROLL (RYK / NON-BWP) --------------------
const getFilteredProfilesPayroll = async (req, res) => {
    try {
        const { start_date, end_date } = req.query;
        if (!start_date || !end_date) {
            return res.status(400).json({
                success: false,
                message: "Start and end dates are required.",
            });
        }
        const start = new Date(start_date);
        const end = new Date(end_date);
        end.setHours(23, 59, 59, 999);
        const targetCompany = "3 into 3";
        const Projects = db.collection("projects");
        const HourlyRecords = db.collection("hourlyprojectrecords");
        /* ================= FIXED PAYROLL (NON-BWP) ================= */
        const fixed = await Projects.aggregate([
            {
                $match: {
                    status: "completed",
                    company: targetCompany,
                    updated_at: { $gte: start, $lte: end },
                },
            },
            {
                $lookup: {
                    from: "workersalaries",
                    localField: "project_id",
                    foreignField: "project_id",
                    as: "ws",
                },
            },
            { $unwind: "$ws" },
            {
                $addFields: {
                    profile_debit_num: {
                        $convert: {
                            input: "$ws.profile_debit",
                            to: "double",
                            onError: 0,
                            onNull: 0,
                        },
                    },
                    salary_num: {
                        $convert: {
                            input: "$ws.salary",
                            to: "double",
                            onError: 0,
                            onNull: 0,
                        },
                    },
                },
            },
            /* 🔹 Group per project + profile */
            {
                $group: {
                    _id: {
                        profile_name: "$profile_name",
                        project_id: "$project_id",
                    },
                    profile_name: { $first: "$profile_name" },
                    profile_debit: { $first: "$profile_debit_num" },
                    bwp_salary: {
                        $sum: {
                            $cond: [{ $eq: ["$ws.worker_name", "BWP"] }, "$salary_num", 0],
                        },
                    },
                },
            },
            /* 🔹 Net debit (profile - BWP) */
            {
                $addFields: {
                    net_fixed_debit: {
                        $subtract: ["$profile_debit", "$bwp_salary"],
                    },
                },
            },
            /* 🔹 Final per profile */
            {
                $group: {
                    _id: "$profile_name",
                    profile_name: { $first: "$profile_name" },
                    fixed_profile_debit: { $sum: "$net_fixed_debit" },
                },
            },
        ]).toArray();
        /* ================= HOURLY PAYROLL (NON-BWP) ================= */
        const hourly = await HourlyRecords.aggregate([
            {
                $lookup: {
                    from: "projects",
                    localField: "project_id",
                    foreignField: "project_id",
                    as: "p",
                },
            },
            { $unwind: "$p" },
            {
                $match: {
                    "p.status": "completed",
                    "p.company": targetCompany,
                    "p.updated_at": { $gte: start, $lte: end },
                },
            },
            {
                $addFields: {
                    profile_debit_num: {
                        $convert: {
                            input: "$profile_debit",
                            to: "double",
                            onError: 0,
                            onNull: 0,
                        },
                    },
                    salary_num: {
                        $convert: {
                            input: "$salary",
                            to: "double",
                            onError: 0,
                            onNull: 0,
                        },
                    },
                },
            },
            {
                $group: {
                    _id: {
                        profile_name: "$p.profile_name",
                        project_id: "$project_id",
                    },
                    profile_name: { $first: "$p.profile_name" },
                    profile_debit: { $first: "$profile_debit_num" },
                    bwp_salary: {
                        $sum: {
                            $cond: [{ $eq: ["$worker_name", "BWP"] }, "$salary_num", 0],
                        },
                    },
                },
            },
            {
                $addFields: {
                    net_hourly_debit: {
                        $subtract: ["$profile_debit", "$bwp_salary"],
                    },
                },
            },
            {
                $group: {
                    _id: "$profile_name",
                    profile_name: { $first: "$profile_name" },
                    hourly_profile_debit: { $sum: "$net_hourly_debit" },
                },
            },
        ]).toArray();
        /* ================= MERGE FIXED + HOURLY ================= */
        const map = new Map();
        fixed.forEach((f) => {
            map.set(f.profile_name, {
                profile_name: f.profile_name,
                fixed_profile_debit: f.fixed_profile_debit,
                hourly_profile_debit: 0,
            });
        });
        hourly.forEach((h) => {
            const e = map.get(h.profile_name) || {
                profile_name: h.profile_name,
                fixed_profile_debit: 0,
                hourly_profile_debit: 0,
            };
            e.hourly_profile_debit = h.hourly_profile_debit;
            map.set(h.profile_name, e);
        });
        const final = Array.from(map.values()).map((e) => ({
            ...e,
            total_profile_debit: e.fixed_profile_debit + e.hourly_profile_debit,
        }));
        res.json({ success: true, data: final });
    }
    catch (err) {
        console.error("Filtered profile payroll error:", err);
        res.status(500).json({ success: false, message: "Server error" });
    }
};
exports.getFilteredProfilesPayroll = getFilteredProfilesPayroll;
// -------------------- 🔹 FILTERED PROFILES PAYROLL (BWP) --------------------
const getFilteredBWPProfilesPayroll = async (req, res) => {
    try {
        const { start_date, end_date } = req.query;
        if (!start_date || !end_date) {
            return res.status(400).json({
                success: false,
                message: "Start and end dates are required.",
            });
        }
        const start = new Date(start_date);
        const end = new Date(end_date);
        end.setHours(23, 59, 59, 999);
        const targetCompany = "3 into 3";
        const Projects = db.collection("projects");
        const HourlyRecords = db.collection("hourlyprojectrecords");
        /* ================= FIXED PAYROLL (BWP) ================= */
        const fixed = await Projects.aggregate([
            {
                $match: {
                    status: "completed",
                    company: targetCompany,
                    updated_at: { $gte: start, $lte: end },
                },
            },
            {
                $lookup: {
                    from: "workersalaries",
                    localField: "project_id",
                    foreignField: "project_id",
                    as: "ws",
                },
            },
            { $unwind: "$ws" },
            {
                $addFields: {
                    salary_num: {
                        $convert: { input: "$ws.salary", to: "double", onError: 0, onNull: 0 },
                    },
                },
            },
            {
                $group: {
                    _id: { profile_name: "$profile_name", project_id: "$project_id" },
                    profile_name: { $first: "$profile_name" },
                    bwp_salary: {
                        $sum: { $cond: [{ $eq: ["$ws.worker_name", "BWP"] }, "$salary_num", 0] },
                    },
                },
            },
            {
                $group: {
                    _id: "$profile_name",
                    profile_name: { $first: "$profile_name" },
                    fixed_debit: { $sum: "$bwp_salary" },
                },
            },
        ]).toArray();
        /* ================= HOURLY PAYROLL (BWP) ================= */
        const hourly = await HourlyRecords.aggregate([
            {
                $lookup: {
                    from: "projects",
                    localField: "project_id",
                    foreignField: "project_id",
                    as: "p",
                },
            },
            { $unwind: "$p" },
            {
                $match: {
                    "p.status": "completed",
                    "p.company": targetCompany,
                    "p.updated_at": { $gte: start, $lte: end },
                },
            },
            {
                $addFields: {
                    salary_num: {
                        $convert: { input: "$salary", to: "double", onError: 0, onNull: 0 },
                    },
                },
            },
            {
                $group: {
                    _id: { profile_name: "$p.profile_name", project_id: "$project_id" },
                    profile_name: { $first: "$p.profile_name" },
                    bwp_salary: {
                        $sum: { $cond: [{ $eq: ["$worker_name", "BWP"] }, "$salary_num", 0] },
                    },
                },
            },
            {
                $group: {
                    _id: "$profile_name",
                    profile_name: { $first: "$profile_name" },
                    hourly_debit: { $sum: "$bwp_salary" },
                },
            },
        ]).toArray();
        /* ================= MERGE FIXED + HOURLY ================= */
        const map = new Map();
        fixed.forEach((f) => {
            map.set(f.profile_name, { profile_name: f.profile_name, fixed_debit: f.fixed_debit, hourly_debit: 0 });
        });
        hourly.forEach((h) => {
            const e = map.get(h.profile_name) || { profile_name: h.profile_name, fixed_debit: 0, hourly_debit: 0 };
            e.hourly_debit = h.hourly_debit;
            map.set(h.profile_name, e);
        });
        const final = Array.from(map.values()).map((e) => ({
            ...e,
            total_debit: e.fixed_debit + e.hourly_debit,
        }));
        res.json({ success: true, data: final });
    }
    catch (err) {
        console.error("Filtered BWP payroll error:", err);
        res.status(500).json({ success: false, message: "Server error" });
    }
};
exports.getFilteredBWPProfilesPayroll = getFilteredBWPProfilesPayroll;
// -------------------- 🔹 GET COMPANIES FOR DROPDOWN --------------------
const getCompanies = async (req, res) => {
    try {
        const Projects = db.collection("projects");
        const companies = await Projects.distinct("company", {
            company: { $ne: null },
        });
        res.json({ success: true, data: companies });
    }
    catch (err) {
        console.error("Error fetching companies:", err);
        res.status(500).json({ success: false, message: "Server error" });
    }
};
exports.getCompanies = getCompanies;
// -------------------- 🔹 COMPANY PAYROLL --------------------
const getCompanyPayroll = async (req, res) => {
    try {
        const { company } = req.params;
        const { start_date, end_date } = req.query;
        if (!company) {
            return res.status(400).json({ success: false, message: "Company required." });
        }
        if (!start_date || !end_date) {
            return res.status(400).json({
                success: false,
                message: "Start and end dates are required.",
            });
        }
        const start = new Date(start_date);
        const end = new Date(end_date);
        end.setHours(23, 59, 59, 999);
        const Projects = db.collection("projects");
        const HourlyRecords = db.collection("hourlyprojectrecords");
        /* ================= FIXED PROJECTS ================= */
        const fixed = await Projects.aggregate([
            {
                $match: {
                    company,
                    status: "completed",
                    updated_at: { $gte: start, $lte: end },
                },
            },
            {
                $lookup: {
                    from: "workersalaries",
                    localField: "project_id",
                    foreignField: "project_id",
                    as: "ws",
                },
            },
            { $unwind: "$ws" },
            {
                $addFields: {
                    entries_num: {
                        $convert: {
                            input: "$ws.no_of_entries",
                            to: "double",
                            onError: 0,
                            onNull: 0,
                        },
                    },
                    debit_num: {
                        $convert: {
                            input: "$ws.profile_debit",
                            to: "double",
                            onError: 0,
                            onNull: 0,
                        },
                    },
                },
            },
            {
                $group: {
                    _id: "$project_id",
                    project_id: { $first: "$project_id" },
                    project_name: { $first: "$project_name" },
                    profile_name: { $first: "$profile_name" },
                    sheet_name: { $first: "$sheet_name" },
                    price_per_entry: { $first: "$price_worker_one" },
                    worker_entries: { $sum: "$entries_num" },
                    profile_debit: { $max: "$debit_num" },
                    company: { $first: "$company" },
                },
            },
        ]).toArray();
        /* ================= HOURLY PROJECTS ================= */
        const hourly = await HourlyRecords.aggregate([
            {
                $lookup: {
                    from: "projects",
                    localField: "project_id",
                    foreignField: "project_id",
                    as: "p",
                },
            },
            { $unwind: "$p" },
            {
                $match: {
                    "p.company": company,
                    "p.status": "completed",
                    "p.updated_at": { $gte: start, $lte: end },
                },
            },
            {
                $addFields: {
                    hours_num: {
                        $convert: {
                            input: "$runned_hours",
                            to: "double",
                            onError: 0,
                            onNull: 0,
                        },
                    },
                    debit_num: {
                        $convert: {
                            input: "$salary",
                            to: "double",
                            onError: 0,
                            onNull: 0,
                        },
                    },
                },
            },
            {
                $project: {
                    project_id: "$project_id",
                    project_name: "$p.project_name",
                    profile_name: "$p.profile_name",
                    sheet_name: "$p.sheet_name",
                    price_per_entry: "$p.price_per_hour",
                    worker_entries: "$hours_num",
                    profile_debit: "$debit_num",
                    company: "$p.company",
                },
            },
        ]).toArray();
        const allData = [...fixed, ...hourly];
        const totals = allData.reduce((acc, i) => {
            acc.grand += i.profile_debit || 0;
            return acc;
        }, { grand: 0 });
        res.json({
            success: true,
            data: allData,
            totals: {
                grand: totals.grand.toFixed(2),
            },
        });
    }
    catch (err) {
        console.error("Company payroll error:", err);
        res.status(500).json({ success: false, message: "Server error" });
    }
};
exports.getCompanyPayroll = getCompanyPayroll;
// -------------------- 🔹 INFONAV - TEAM BWP PAYROLL --------------------
const getInfonavBwpPayroll = async (req, res) => {
    try {
        const { start_date, end_date } = req.query;
        if (!start_date || !end_date) {
            return res.status(400).json({
                success: false,
                message: "Start and end date are required.",
            });
        }
        const start = new Date(start_date);
        const end = new Date(end_date);
        end.setHours(23, 59, 59, 999);
        const WorkerSalaries = db.collection("workersalaries");
        const HourlyRecords = db.collection("hourlyprojectrecords");
        /* ================= FIXED PROJECTS (BWP) ================= */
        const fixed = await WorkerSalaries.aggregate([
            {
                $lookup: {
                    from: "projects",
                    localField: "project_id",
                    foreignField: "project_id",
                    as: "p",
                },
            },
            { $unwind: "$p" },
            // 🔴 MISSING FILTER (THIS IS THE BUG)
            {
                $match: {
                    worker_name: "BWP",
                    "p.company": "infonav",
                    "p.status": "completed",
                    $expr: {
                        $and: [
                            { $gte: [{ $toDate: "$p.updated_at" }, start] },
                            { $lte: [{ $toDate: "$p.updated_at" }, end] },
                        ],
                    },
                },
            },
            {
                $addFields: {
                    salary_num: { $toDouble: "$salary" },
                    entries_num: { $toDouble: "$no_of_entries" },
                },
            },
            {
                $group: {
                    _id: "$project_id",
                    project_id: { $first: "$project_id" },
                    project_name: { $first: "$p.project_name" },
                    worker_name: { $first: "$worker_name" },
                    price_per_entry: { $first: "$p.price_worker_one" },
                    sheet_name: { $first: "$p.sheet_name" },
                    profile_name: { $first: "$p.profile_name" },
                    entries: { $sum: "$entries_num" },
                    salary: { $sum: "$salary_num" },
                    company: { $first: "$p.company" },
                },
            },
        ]).toArray();
        /* ================= HOURLY PROJECTS (BWP) ================= */
        const hourly = await HourlyRecords.aggregate([
            {
                $lookup: {
                    from: "projects",
                    localField: "project_id",
                    foreignField: "project_id",
                    as: "p",
                },
            },
            { $unwind: "$p" },
            // MISSING FILTER
            {
                $match: {
                    worker_name: "BWP",
                    "p.company": "infonav",
                    "p.status": "completed",
                    $expr: {
                        $and: [
                            { $gte: [{ $toDate: "$p.updated_at" }, start] },
                            { $lte: [{ $toDate: "$p.updated_at" }, end] },
                        ],
                    },
                },
            },
            {
                $addFields: {
                    salary_num: { $toDouble: "$salary" },
                    hours_num: { $toDouble: "$runned_hours" },
                },
            },
            {
                $group: {
                    _id: "$project_id",
                    project_id: { $first: "$project_id" },
                    project_name: { $first: "$p.project_name" },
                    worker_name: { $first: "$worker_name" },
                    price_per_entry: { $first: "$p.price_per_hour" },
                    sheet_name: { $first: "$p.sheet_name" },
                    profile_name: { $first: "$p.profile_name" },
                    entries: { $sum: "$hours_num" },
                    salary: { $sum: "$salary_num" },
                    company: { $first: "$p.company" },
                },
            },
        ]).toArray();
        res.json({
            success: true,
            data: [...fixed, ...hourly],
        });
    }
    catch (err) {
        console.error("Infonav BWP payroll error:", err);
        res.status(500).json({ success: false, message: "Server error" });
    }
};
exports.getInfonavBwpPayroll = getInfonavBwpPayroll;

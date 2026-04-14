import { Request, Response } from "express";
import { applyRevisionInternal } from './payrollController';
import Project from "../models/Project";
import ProjectRevision from "../models/projectRevision";
import User from "../models/user";
import Column from "../models/column";
import bcrypt from "bcryptjs";
import { getSheetsClient, getAuthClient } from "../config/googleSheets";
import { google } from "googleapis";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const db = mongoose.connection;


// Reuse existing ProjectData model if already compiled, avoid OverwriteModelError
const ProjectData =
  (mongoose.models && (mongoose.models as any).ProjectData) ||
  mongoose.model(
    "ProjectData",
    new mongoose.Schema({}, { strict: false, collection: "project_data" })
  );

// Define TypeScript interface for type safety
interface IProjectData {
  project_id: string;
  row_data: any[];
  updated_at?: Date;
}

/* -------------------- 🔹 Get Users with Pagination + Search -------------------- */
export const getUsers = async (req: Request, res: Response) => {
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

    // Fetch users with pagination — sort by `created_at` to preserve insertion order
    const users = await User.find(search ? searchFilter : {})
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .sort({ created_at: 1 });

    // Count total users
    const totalUsers = await User.countDocuments(search ? searchFilter : {});

    res.json({
      success: true,
      users,
      totalUsers,
    });
  } catch (err: any) {
    console.error("❌ Error fetching users:", err);
    res.status(500).json({ success: false, message: "Failed to fetch users" });
  }
};



// ===========================
// DELETE USER
// ===========================
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;

    const deleted = await User.findByIdAndDelete(userId);
    if (!deleted) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete user", error });
  }
};

// ===========================
// UPDATE USER ROLE
// ===========================
export const updateUserRole = async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;
    const { role } = req.body;

    const validRoles = ["admin", "user", "profile", "manager"];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { role },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // ⭐ Return new JWT with updated role
    const token = jwt.sign(
      {
        id: updatedUser._id,
        name: updatedUser.name,
        role: updatedUser.role,
      },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" }
    );

    res.status(200).json({
      message: "Role updated successfully",
      user: updatedUser,
      token, // Return the updated token
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to update role", error });
  }
};


// ===========================
// Add a new user
// ===========================
export const addUser = async (req: Request, res: Response) => {
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
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      role: role.toLowerCase(),
    });

    await newUser.save();

    res.status(201).json({ message: "User added successfully", user: newUser });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to add user", error });
  }
};


/* -------------------- 🔹 Add Project -------------------- */
export const addProject = async (req: Request, res: Response) => {
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

    const newProject = new Project(projectData);
    await newProject.save();

    res.status(201).json({
      success: true,
      message: "Project added successfully!",
      project: newProject,
    });
  } catch (err: any) {
    console.error("❌ Error adding project:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};


/* -------------------- 🔹 Get Profiles for Form -------------------- */
export const getProfilesForForm = async (_req: Request, res: Response) => {
  try {
    const profiles = await User.find({ role: "profile" }, "_id name");
    res.json({ success: true, profiles });
  } catch (err: any) {
    console.error("❌ Error fetching profiles:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/* -------------------- 🔹 Get Managers -------------------- */
export const getManagers = async (_req: Request, res: Response) => {
  try {
    const managers = await User.find({ role: "manager" }, "_id name");
    res.json({ success: true, managers });
  } catch (err: any) {
    console.error("❌ Error fetching managers:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/* -------------------- 🔹 Get Columns -------------------- */
export const getColumns = async (_req: Request, res: Response) => {
  try {
    const columns = await Column.find({}, "_id name");
    res.json({ success: true, columns });
  } catch (err: any) {
    console.error("❌ Error fetching columns:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/* -------------------- 🔹 Get Next Project Values -------------------- */
export const getNextProjectValues = async (_req: Request, res: Response) => {
  try {
    // Get the latest project by project_id
    const latest = await Project.findOne({
      project_id: { $regex: /^PROJ-\d+$/ }
    }).sort({ project_id: -1 });

    let nextNumber = 1;

    if (latest?.project_id) {
      const match = latest.project_id.match(/PROJ-(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }

    const nextProjectId = `PROJ-${String(nextNumber).padStart(3, "0")}`;
    const nextProjectName = `Project-${nextNumber}`;

    res.json({
      success: true,
      nextProjectId,
      nextProjectName,
    });
  } catch (err: any) {
    console.error("❌ Error generating next project values:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};


/* -------------------- 🔹 Add Hourly Project -------------------- */
export const addHourlyProject = async (req: Request, res: Response) => {
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

    const newProject = new Project(projectData);
    await newProject.save();

    res.status(201).json({
      success: true,
      message: "Hourly project added successfully!",
      project: newProject,
    });
  } catch (err: any) {
    console.error("❌ Error adding hourly project:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};


/* -------------------- 🔹 Save Hourly Calculation -------------------- */
export const saveHourlyCalculation = async (req: Request, res: Response) => {
  try {
    const { projectId, salaries } = req.body;

    if (!projectId || !salaries || !Array.isArray(salaries)) {
      return res.status(400).json({ success: false, message: "Invalid data" });
    }

    let pid = String(projectId);

    // If looks like an ObjectId, try to resolve to the project's external id
    if (mongoose.Types.ObjectId.isValid(pid)) {
      const proj = await Project.findById(pid).select("project_id").lean();
      if (proj && proj.project_id) pid = proj.project_id;
    }

    const totalProfileDebit = salaries.reduce((sum: number, s: any) => sum + Number(s.salary || 0), 0);

    const docs = salaries.map((s: any) => ({
      worker_name: s.worker,
      project_id: pid,
      salary: Number(s.salary || 0),
      profile_debit: totalProfileDebit,
      runned_hours: Number(s.runnedHours || 0),
      created_at: new Date(),
    }));

    await db.collection("hourlyprojectrecords").insertMany(docs);

    res.json({ success: true });
  } catch (error) {
    console.error("Error saving hourly data:", error);
    res.status(500).json({ success: false, message: "Failed to save data" });
  }
};



/* -------------------- 🔹 Get All Unassigned Projects -------------------- */
export const getUnassignedProjects = async (_req: Request, res: Response) => {
  try {
    const projects = await Project.find({
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
  } catch (error: any) {
    console.error("❌ Error fetching projects:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};


/* -------------------- 🔹 Get Users and Coordinators -------------------- */
export const getUsersAndCoordinators = async (_req: Request, res: Response) => {
  try {
    const users = await User.find({ role: "user" }, "_id name email");
    const managers = await User.find({ role: "manager" }, "_id name email");
    res.json({ success: true, users, managers });
  } catch (err: any) {
    console.error("❌ Error fetching users/coordinators:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/* -------------------- 🔹 Assign Project -------------------- */
export const assignProject = async (req: Request, res: Response) => {
  try {
    const { projectId, assignedUsers, assignedCoordinators } = req.body;

    if (!projectId) {
      return res.status(400).json({ success: false, message: "Project ID required." });
    }

    // Normalize inputs
    const userIds: string[] = Array.isArray(assignedUsers)
      ? assignedUsers
      : assignedUsers
        ? [assignedUsers]
        : [];

    const coordinatorIds: string[] = Array.isArray(assignedCoordinators)
      ? assignedCoordinators
      : assignedCoordinators
        ? [assignedCoordinators]
        : [];

    // Fetch current project to determine removed users & sheet URL
    const project = await Project.findById(projectId).select("assigned_to_ids google_sheet_url");
    if (!project) return res.status(404).json({ success: false, message: "Project not found" });

    const oldAssignedIds: string[] = project.assigned_to_ids
      ? project.assigned_to_ids.split(",").map((s: string) => s.trim()).filter(Boolean)
      : [];

    // Fetch user details (names & emails)
    const [users, coordinators] = await Promise.all([
      userIds.length ? User.find({ _id: { $in: userIds } }, "name email") : [],
      coordinatorIds.length ? User.find({ _id: { $in: coordinatorIds } }, "name email") : [],
    ]);

    const userNames = (users as any[]).map((u) => u.name).join(", ");
    const coordinatorNames = (coordinators as any[]).map((c) => c.name).join(", ");

    const assigned_to = [userNames, coordinatorNames].filter(Boolean).join(", ") || null;
    const assigned_to_ids = userIds.join(", ") || null;
    const assigned_to_coordinators = coordinatorIds.join(", ") || null;

    // Update Mongo project document
    await Project.findByIdAndUpdate(projectId, {
      assigned_to,
      assigned_to_ids,
      assigned_to_coordinators,
      status: assigned_to ? "assigned" : "pending",
      updated_at: new Date(),
    });

    // Compute removed users (previously assigned but no longer present)
    const removedUserIds = oldAssignedIds.filter((id) => !userIds.includes(id));

    // If there's a Google Sheet URL, compute spreadsheetId
    let spreadsheetId: string | null = null;
    if (project.google_sheet_url) {
      try {
        spreadsheetId = project.google_sheet_url.split("/d/")[1].split("/")[0];
      } catch (e) {
        spreadsheetId = null;
      }
    }

    // Helper: grant access via Drive API
    const grantSheetAccess = async (sheetId: string, emails: string[]) => {
      if (!sheetId || emails.length === 0) return;
      const auth = getAuthClient();
      const authClient = await auth.getClient();
      const drive = google.drive({ version: "v3", auth: authClient });

      for (const email of Array.from(new Set(emails))) {
        try {
          await drive.permissions.create({
            fileId: sheetId,
            requestBody: {
              role: "writer",
              type: "user",
              emailAddress: email,
            },
            fields: "id",
            sendNotificationEmail: false,
          });
        } catch (err: any) {
          console.error(`Failed to grant access to ${email}:`, err?.message || err);
        }
      }
    };

    // Helper: revoke access via Drive API (find permission by email)
    const revokeSheetAccess = async (sheetId: string, emails: string[]) => {
      if (!sheetId || emails.length === 0) return;
      const auth = getAuthClient();
      const authClient = await auth.getClient();
      const drive = google.drive({ version: "v3", auth: authClient });

      try {
        const resp = await drive.permissions.list({ fileId: sheetId, fields: "permissions(id,emailAddress)" });
        const perms = resp.data.permissions || [];

        for (const email of emails) {
          const found = perms.find((p: any) => p.emailAddress === email);
          if (found && found.id) {
            try {
              await drive.permissions.delete({ fileId: sheetId, permissionId: found.id });
            } catch (err: any) {
              console.error(`Failed to revoke permission ${found.id} for ${email}:`, err?.message || err);
            }
          }
        }
      } catch (err: any) {
        console.error("Failed to list/revoke permissions:", err?.message || err);
      }
    };

    // Revoke removed users' sheet access
    if (spreadsheetId && removedUserIds.length > 0) {
      const removedEmails = await User.find({ _id: { $in: removedUserIds } }, "email").then((docs) => (docs as any[]).map((d) => d.email).filter(Boolean));
      if (removedEmails.length) await revokeSheetAccess(spreadsheetId, removedEmails);
    }

    // Grant access to newly assigned users & coordinators
    const allEmails = [
      ...(users as any[]).map((u) => u.email),
      ...(coordinators as any[]).map((c) => c.email),
    ].filter(Boolean) as string[];

    if (spreadsheetId && allEmails.length) {
      await grantSheetAccess(spreadsheetId, allEmails);
    }

    res.json({ success: true, message: "Project assigned successfully!", assigned_to });

  } catch (err: any) {
    console.error("❌ Error assigning project:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};



/* -------------------- 🔹 Get Assigned Projects -------------------- */
/* -------------------- 🔹 Get Assigned Projects -------------------- */
export const getAssignedProjects = async (_req: Request, res: Response) => {
  try {
    const projects = await Project.find({
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
  } catch (err: any) {
    console.error("❌ Error fetching assigned projects:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};


// Unpriced Unassigned Project
export const getUnpricedUnassignedProjects = async (_req: Request, res: Response) => {
  try {
    const projects = await Project.find({
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
  } catch (err: any) {
    console.error("❌ Error fetching unpriced unassigned projects:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};


// ----------------------------
// Get Unpriced Assigned Projects
// ----------------------------
export const getUnpricedAssignedProjects = async (_req: Request, res: Response) => {
  try {
    const projects = await Project.find({
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
  } catch (err: any) {
    console.error("❌ Error fetching unpriced assigned projects:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};





/* -------------------- 🔹 Update project after editing -------------------- */
export const updateProject = async (req: Request, res: Response) => {
  try {
    const updatedProject = await Project.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json({ success: true, project: updatedProject });
  } catch (err: any) {
    console.error("Error updating project:", err);
    res.status(500).json({ success: false, message: "Error updating project" });
  }
};



/* -------------------- 🔹 Get All Hourly Unassigned Projects -------------------- */
export const getHourlyUnassignedProjects = async (_req: Request, res: Response) => {
  try {
    const projects = await Project.find({
      assigned_to: { $in: [null, ""] },  // 🔥 unassigned
      status: "pending",                 // 🔥 only pending
      project_type: "hourly",            // 🔥 only hourly
    })
      .sort({ created_at: -1 })
      .lean();

    const parsedProjects = projects.map((p: any) => ({
      ...p,
      assigned_to_ids: p.assigned_to_ids
        ? p.assigned_to_ids.split(",").map((id: string) => id.trim())
        : [],
    }));

    res.json({ success: true, projects: parsedProjects });
  } catch (err: any) {
    console.error("❌ Error fetching hourly unassigned projects (ADMIN):", err);
    res.status(500).json({ success: false, message: err.message });
  }
};






/* -------------------- 🔹 Get Hourly Assigned Projects -------------------- */
export const getHourlyAssignedProjects = async (_req: Request, res: Response) => {
  try {
    const projects = await Project.find({
      assigned_to: { $nin: ["", null] }, // assigned
      project_type: "hourly",
      status: "assigned",
      price_per_hour: { $ne: null },
    }).sort({ created_at: -1 });


    res.json({ success: true, projects });
  } catch (err: any) {
    console.error("❌ Error fetching hourly assigned projects:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};



/* -------------------- 🔹 Update Hourly Project -------------------- */
export const updateHourlyProject = async (req: Request, res: Response) => {
  try {
    const projectId = req.params.id;
    const allowedFields = ["project_name", "profile_name", "sheet_name", "project_type", "price_per_hour"];
    const updateData: any = {};

    // Only allow updating these fields
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) {
        updateData[key] = req.body[key];
      }
    }

    const updatedProject = await Project.findByIdAndUpdate(projectId, updateData, { new: true });

    if (!updatedProject) {
      return res.status(404).json({ success: false, message: "Hourly project not found." });
    }

    res.json({ success: true, project: updatedProject });
  } catch (err: any) {
    console.error("❌ Error updating hourly project:", err);
    res.status(500).json({ success: false, message: "Error updating hourly project" });
  }
};



// Get project details for Go to Project button
export const getProjectDetails = async (req: Request, res: Response) => {
  const { projectId } = req.params;

  try {
    const project = await Project.findOne({ project_id: projectId }).lean();

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
  } catch (error) {
    console.error("Error fetching project details:", error);
    res.status(500).json({ success: false, message: "Database error." });
  }
};



// Update project status when clicking Go to Project
export const updateProjectStatus = async (req: Request, res: Response) => {
  const { projectId } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ success: false, message: "Status is required" });
  }

  try {
    const project = await Project.findOneAndUpdate(
      { project_id: projectId },
      { sheet_status: status, last_opened: new Date() },
      { new: true }
    );

    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found." });
    }

    res.json({ success: true, message: "Project status updated successfully" });
  } catch (error) {
    console.error("Error updating project status:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};


// For go to project button to write columns
export const writeProjectColumns = async (req: Request, res: Response) => {
  try {
    const projectId = req.params.projectId;

    // Fetch project
    const project = await Project.findOne({ project_id: projectId });
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

    const sheets = getSheetsClient();

    // Fetch all sheet metadata
    const sheetMeta = await sheets.spreadsheets.get({ spreadsheetId });
    const sheetsList = sheetMeta.data.sheets ?? [];

    const tabName = project.project_name?.trim() || "";

    // Debug logs to help match sheets when titles differ slightly
    console.log('Looking for tabName:', tabName);
    console.log('Available sheets:', sheetsList.map((s) => s.properties?.title));
    console.log(
      'Normalized sheet titles:',
      sheetsList.map((s) => String(s.properties?.title || '').replace(/[^\w\s]/g, '').trim().toLowerCase())
    );

    // Try exact match first, then normalized match that strips punctuation and compares
    let sheetObj = sheetsList.find((s) => s.properties?.title === tabName);
    if (!sheetObj) {
      const clean = (str = "") => String(str).replace(/[^\w\s]/g, "").trim().toLowerCase();
      const normalizedTab = clean(tabName);
      console.log('Normalized tab:', normalizedTab);
      sheetObj = sheetsList.find((s) => {
        const title = (s.properties?.title || "").trim();
        const normalizedTitle = clean(title);
        return (
          normalizedTitle === normalizedTab ||
          normalizedTitle.includes(normalizedTab) ||
          normalizedTab.includes(normalizedTitle)
        );
      });
    }

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
    const normalize = (str: string) => str.trim().toLowerCase();

    // ----------------------- WORKER COLUMN MAP -----------------------
    const workerMap: Record<string, string[]> = {
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

    const existingHeader: string[] = headerResp.data.values?.[0] ?? [];
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

  } catch (err) {
    console.error("❌ Error in writeProjectColumns:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error while writing to sheet.",
    });
  }
};


// server/src/controllers/adminController.ts
// ----------------- Sync service: syncAllProjects -----------------
export const syncAllProjects = async (): Promise<{ success: boolean; message: string }> => {
  try {
    const sheetsClient = getSheetsClient();

    // Find projects that are "In Work" in sheet_status (matches your MySQL logic)
    const inWorkProjects = await Project.find({ sheet_status: "In Work" }).select(
      "project_id project_name google_sheet_url"
    ).lean();

    if (!inWorkProjects || inWorkProjects.length === 0) {
      console.log("⚠️ No active projects found for sync.");
      return { success: false, message: "No active projects found." };
    }

    for (const proj of inWorkProjects) {
      const { project_id, google_sheet_url, project_name } = proj as any;
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
      const tabNames = sheetsList.map((s: any) => s?.properties?.title || "");

      // Normalize
      const normalizedProjectName = (project_name || "").trim().toLowerCase();

      // Find matching tab by normalized name (case-insensitive trim)
      const matchedTab = tabNames.find(
        (name: string) => (name || "").trim().toLowerCase() === normalizedProjectName
      );

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
      const existing = (await ProjectData.findOne({ project_id }).lean()) as IProjectData | null;

      let dbDataArray: any[] = [];
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
        await ProjectData.findOneAndUpdate(
          { project_id },
          { project_id, row_data: finalDataToSave, updated_at: new Date() },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        console.log(`💾 DB updated for project ${project_id}. Detected ${changesFound} changed cell(s).`);
      } else {
        console.log(`✅ No changes for project ${project_id}. DB is in sync.`);
      }
    }

    console.log("✅ Project data sync completed.");
    return { success: true, message: "Project data synchronized successfully." };
  } catch (err) {
    console.error("❌ Error syncing project data:", err);
    return { success: false, message: "Failed to sync project data." };
  }
};

// Express controller wrapper
export const syncProjectDataController = async (req: Request, res: Response) => {
  const result = await syncAllProjects();
  if (result.success) return res.json({ success: true, message: result.message });
  return res.status(500).json({ success: false, message: result.message });
};

// GET ALL USERS EXCEPT ADMIN
export const getUsersProfiles = async (req: Request, res: Response) => {
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
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ success: false, message: "Database error." });
  }
};

// This is for user payroll
export const getUserPayroll = async (req: Request, res: Response) => {
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
    const start = new Date(start_date as string);
    const end = new Date(end_date as string);
    end.setHours(23, 59, 59, 999);

    // ---------------------
    // Collections
    // ---------------------
    const Projects = db.collection("projects");
    const Hourly = db.collection("hourlyprojectrecords");

    // Build a tolerant regex pattern from the selected username that ignores
    // extra whitespace/punctuation and is case-insensitive. This helps match
    // stored worker_name variations like extra spaces, dashes or commas.
    const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const nameWords = selectedUsername.split(/\W+/).filter(Boolean);
    const namePattern = nameWords.length
      ? `^\\W*${nameWords.map(escapeRegex).join("\\W+")}\\W*$`
      : `^${escapeRegex(selectedUsername)}$`;

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
        // tolerant username match (ignores punctuation/extra spaces, case-insensitive)
        $match: { "ws.worker_name": { $regex: namePattern, $options: "i" } }
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
          // tolerant username match for hourly records too
          worker_name: { $regex: namePattern, $options: "i" }
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
        message:
          "No payroll data available for the selected user within the selected dates."
      });
    }

    res.json({ success: true, data: combinedResults });

  } catch (error) {
    console.error("Error fetching payroll data:", error);
    return res.status(500).json({
      success: false,
      message: "Server error."
    });
  }
};



// -------------------- 🔹 Fetch only profiles for the dropdown --------------------
export const getProfilesForDropDown = async (req: Request, res: Response) => {
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
  } catch (err) {
    console.error("Error fetching profiles:", err);
    res.status(500).json({ success: false, message: "Database error." });
  }
};

// -------------------- 🔹 Fetch individual profile payroll --------------------
export const getProfilePayroll = async (req: Request, res: Response) => {
  try {
    const profileName = (req.params.profileName || "").trim();
    const { start_date, end_date } = req.query;

    if (!profileName) {
      return res.status(400).json({ success: false, message: "Profile name not provided." });
    }

    if (!start_date || !end_date) {
      return res.status(400).json({ success: false, message: "Start date and end date are required." });
    }

    const start = new Date(start_date as string);
    const end = new Date(end_date as string);
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
          fixed_option: { $first: "$fixed_option" },
          price_worker_one: { $first: "$price_worker_one" },
          price_worker_two: { $first: "$price_worker_two" },
          price_worker_three: { $first: "$price_worker_three" },
          price_worker_four: { $first: "$price_worker_four" },
          price_worker_five: { $first: "$price_worker_five" },
          lumpsum_price: { $first: "$lumpsum_price" },
          price_per_hour: { $first: "$price_per_hour" },
          profile_debit: { $first: "$ws.profile_debit" },
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
    const combinedMap: Record<string, any> = {};
    [...fixedResults, ...hourlyResults].forEach((item) => {
      if (!combinedMap[item.project_id]) combinedMap[item.project_id] = item;
    });

    const combinedResults = Object.values(combinedMap);

    if (!combinedResults.length) {
      return res.status(404).json({ success: false, message: "No payroll data found for the selected profile." });
    }

    res.json({ success: true, data: combinedResults });
  } catch (err) {
    console.error("Error fetching profile payroll:", err);
    res.status(500).json({ success: false, message: "Server error." });
  }
};




// -------------------- 🔹 Fetch ALL USERS payroll --------------------
export const getAllUsersPayroll = async (req: Request, res: Response) => {
  try {
    const { start_date, end_date } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        message: "Start date and end date are required.",
      });
    }

    const start = new Date(start_date as string);
    const end = new Date(end_date as string);
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
    const payrollMap = new Map<string, any>();

    fixedResults.forEach((r: any) => {
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

    hourlyResults.forEach((r: any) => {
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
      } else {
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
  } catch (err) {
    console.error("Error fetching all users payroll:", err);
    res.status(500).json({ success: false, message: "Server error." });
  }
};

// -------------------- 🔹 Fetch ALL PROFILES payroll --------------------
export const getAllProfilesPayroll = async (req: Request, res: Response) => {
  try {
    const { start_date, end_date } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        message: "Start date and end date are required.",
      });
    }

    const start = new Date(start_date as string);
    const end = new Date(end_date as string);
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
    const map = new Map<string, any>();

    fixed.forEach((f: any) => {
      map.set(f.profile_name, {
        profile_name: f.profile_name,
        fixed_profile_debit: f.fixed_profile_debit,
        hourly_profile_debit: 0,
        fixed_entries: f.fixed_entries,
        hourly_entries: 0,
      });
    });

    hourly.forEach((h: any) => {
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
      total_profile_debit:
        e.fixed_profile_debit + e.hourly_profile_debit,
      total_entries: e.fixed_entries + e.hourly_entries,
    }));

    res.json({ success: true, data: final });
  } catch (err) {
    console.error("Profiles payroll error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};


// -------------------- 🔹 FILTERED PROFILES PAYROLL (RYK / NON-BWP) --------------------
export const getFilteredProfilesPayroll = async (req: Request, res: Response) => {
  try {
    const { start_date, end_date } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        message: "Start and end dates are required.",
      });
    }

    const start = new Date(start_date as string);
    const end = new Date(end_date as string);
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
    const map = new Map<string, any>();

    fixed.forEach((f: any) => {
      map.set(f.profile_name, {
        profile_name: f.profile_name,
        fixed_profile_debit: f.fixed_profile_debit,
        hourly_profile_debit: 0,
      });
    });

    hourly.forEach((h: any) => {
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
      total_profile_debit:
        e.fixed_profile_debit + e.hourly_profile_debit,
    }));

    res.json({ success: true, data: final });
  } catch (err) {
    console.error("Filtered profile payroll error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// -------------------- 🔹 FILTERED PROFILES PAYROLL (BWP) --------------------
export const getFilteredBWPProfilesPayroll = async (req: Request, res: Response) => {
  try {
    const { start_date, end_date } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        message: "Start and end dates are required.",
      });
    }

    const start = new Date(start_date as string);
    const end = new Date(end_date as string);
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
    const map = new Map<string, any>();

    fixed.forEach((f: any) => {
      map.set(f.profile_name, { profile_name: f.profile_name, fixed_debit: f.fixed_debit, hourly_debit: 0 });
    });

    hourly.forEach((h: any) => {
      const e = map.get(h.profile_name) || { profile_name: h.profile_name, fixed_debit: 0, hourly_debit: 0 };
      e.hourly_debit = h.hourly_debit;
      map.set(h.profile_name, e);
    });

    const final = Array.from(map.values()).map((e) => ({
      ...e,
      total_debit: e.fixed_debit + e.hourly_debit,
    }));

    res.json({ success: true, data: final });
  } catch (err) {
    console.error("Filtered BWP payroll error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};


// -------------------- 🔹 GET COMPANIES FOR DROPDOWN --------------------
export const getCompanies = async (req: Request, res: Response) => {
  try {
    const Projects = db.collection("projects");

    const companies = await Projects.distinct("company", {
      company: { $ne: null },
    });

    res.json({ success: true, data: companies });
  } catch (err) {
    console.error("Error fetching companies:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};



// -------------------- 🔹 COMPANY PAYROLL --------------------
export const getCompanyPayroll = async (req: Request, res: Response) => {
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

    const start = new Date(start_date as string);
    const end = new Date(end_date as string);
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
          fixed_option: { $first: "$fixed_option" },
          price_worker_one: { $first: "$price_worker_one" },
          price_worker_two: { $first: "$price_worker_two" },
          price_worker_three: { $first: "$price_worker_three" },
          price_worker_four: { $first: "$price_worker_four" },
          price_worker_five: { $first: "$price_worker_five" },
          lumpsum_price: { $first: "$lumpsum_price" },
          worker_entries: { $sum: "$entries_num" },
          profile_debit: { $max: "$debit_num" },
          company: { $first: "$company" },
        },
      },
    ]).toArray();

    /* ================= HOURLY PROJECTS ================= */
    /* ================= HOURLY (NOW WORKS) ================= */
    const hourly = await Projects.aggregate([
      {
        $match: {
          company,
          status: "completed",
          updated_at: { $gte: start, $lte: end },
        },
      },
      {
        $lookup: {
          from: "hourlyprojectrecords",
          localField: "project_id",     // plain id
          foreignField: "project_id",   // plain id
          as: "hr",
        },
      },
      { $unwind: "$hr" },
      {
        $project: {
          _id: 0,
          project_id: 1,
          project_name: 1,
          profile_name: 1,
          sheet_name: 1,
          price_per_entry: "$price_per_hour",
          worker_entries: "$hr.runned_hours",
          profile_debit: "$hr.salary",
          company: 1,
        },
      },
    ]).toArray();


    const fixedWithPrices = fixed.map((item: any) => {
      const option = item.fixed_option || "";

      let prices: (number | string)[] = [];

      if (option === "Lumpsum") {
        prices = [item.lumpsum_price];
      } else if (option === "Single Entry") {
        prices = [item.price_worker_one];
      } else if (option === "Double Entry") {
        prices = [item.price_worker_one, item.price_worker_two];
      } else if (option === "Triple Entry") {
        prices = [item.price_worker_one, item.price_worker_two, item.price_worker_three];
      } else if (option === "Fourth Entry") {
        prices = [item.price_worker_one, item.price_worker_two, item.price_worker_three, item.price_worker_four];
      } else if (option === "Fifth Entry") {
        prices = [item.price_worker_one, item.price_worker_two, item.price_worker_three, item.price_worker_four, item.price_worker_five];
      }

      return {
        ...item,
        price_per_entry: prices.filter(Boolean).join(", "), // now lumpsum included
      };
    });



    /* ================= TOTALS ================= */
    const fixedSum = fixed.reduce(
      (sum, i: any) => sum + (i.profile_debit || 0),
      0
    );

    const hourlySum = hourly.reduce(
      (sum, i: any) => sum + (i.profile_debit || 0),
      0
    );

    const grandSum = fixedSum + hourlySum;

    // Use fixedWithPrices (adds price_per_entry string) and combine with hourly
    const combinedData = [...fixedWithPrices, ...hourly];

    // Sort combined results by numeric project_id when possible (ascending)
    combinedData.sort((a: any, b: any) => {
      const aNum = parseInt(String(a.project_id || "").replace(/\D/g, ""), 10);
      const bNum = parseInt(String(b.project_id || "").replace(/\D/g, ""), 10);
      if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
      if (!isNaN(aNum)) return -1;
      if (!isNaN(bNum)) return 1;
      // Fallback to string compare
      return String(a.project_id || "").localeCompare(String(b.project_id || ""));
    });

    res.json({
      success: true,
      data: combinedData,
      totals: {
        fixed: fixedSum.toFixed(2),
        hourly: hourlySum.toFixed(2),
        grand: grandSum.toFixed(2),
      },
    });
  } catch (err) {
    console.error("Company payroll error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ===========================
   GET SUBMITTED PROJECTS
=========================== */
export const getSubmittedProjects = async (req: Request, res: Response) => {
  try {
    const projects = await Project.find({ status: "submitted" })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: projects,
    });
  } catch (error) {
    console.error("❌ Error fetching submitted projects:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch submitted projects",
    });
  }
};




// Get completed projects with optional filters
export const getCompletedProjects = async (req: Request, res: Response) => {
  try {
    const { start_date, end_date, project_name } = req.query;

    const filter: any = { status: "completed" };

    if (start_date && end_date) {
      filter.updated_at = {
        $gte: new Date(start_date as string),
        $lte: new Date(end_date as string),
      };
    }

    if (project_name) {
      filter.project_name = project_name;
    }

    const projects = await Project.find(filter).lean();

    res.json(projects);
  } catch (err) {
    console.error("Error fetching completed projects:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get unique completed project names for dropdown
export const getCompletedProjectNames = async (req: Request, res: Response) => {
  try {
    const names = await Project.distinct("project_name", { status: "completed" });
    res.json(names);
  } catch (err) {
    console.error("Error fetching completed project names:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get projects that are pending revision (marked revised and set back to pending)
export const getPendingRevisions = async (_req: Request, res: Response) => {
  try {
    const projects = await Project.find({ status: 'pending', is_revised: true }).lean().sort({ updated_at: -1 });
    res.json({ success: true, projects });
  } catch (err) {
    console.error('Error fetching pending revisions:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// -------------------------
// Deletable Projects
// -------------------------
export const getDeletableProjectNames = async (req: Request, res: Response) => {
  try {
    // Return distinct project names ordered by their creation time (oldest first)
    const docs = await Project.find({}, { project_name: 1, created_at: 1 }).sort({ created_at: 1 }).lean();
    const names: string[] = [];
    docs.forEach((d: any) => {
      if (d.project_name && !names.includes(d.project_name)) names.push(d.project_name);
    });
    res.json(names);
  } catch (err) {
    console.error("Error fetching deletable project names:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const getDeletableProjects = async (req: Request, res: Response) => {
  try {
    const { start_date, end_date, project_id, project_name } = req.query as any;
    const filter: any = {};

    if (start_date && end_date) {
      filter.updated_at = { $gte: new Date(start_date), $lte: new Date(end_date) };
    }

    if (project_id) filter.project_id = String(project_id);
    if (project_name) filter.project_name = String(project_name);

    const projects = await Project.find(filter).lean();
    res.json(projects);
  } catch (err) {
    console.error("Error fetching deletable projects:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const deleteProject = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;

    const dbInstance = mongoose.connection.db;
    if (!dbInstance) {
      console.error("MongoDB not connected");
      return res.status(500).json({ message: "Database not ready" });
    }

    // Remove related hourly records and worker salaries and project data
    await dbInstance.collection("hourlyprojectrecords").deleteMany({ project_id: projectId });
    await dbInstance.collection("workersalaries").deleteMany({ project_id: projectId });
    await dbInstance.collection("project_data").deleteMany({ project_id: projectId });

    // Remove the main project document
    const deleted = await Project.findOneAndDelete({ project_id: projectId });

    if (!deleted) return res.status(404).json({ message: "Project not found" });

    res.json({ message: `Project ${projectId} deleted successfully.` });
  } catch (err) {
    console.error("Error deleting project:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// -------------------------
// Project Expense
// -------------------------
export const getProjectsList = async (req: Request, res: Response) => {
  try {
    const projects = await Project.find({ status: "completed" })
      .select("project_id project_name")
      .sort({ created_at: 1 })
      .lean();
    res.json(projects);
  } catch (err) {
    console.error("Error fetching project list:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const getProjectPayroll = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    if (!projectId) return res.status(400).json({ success: false, message: "Project ID missing." });

    const project = await Project.findOne({ project_id: projectId }).lean();
    if (!project) return res.status(404).json({ success: false, message: "Project not found." });

    const dbInst = mongoose.connection.db;
    if (!dbInst) {
      console.error("MongoDB not connected");
      return res.status(500).json({ success: false, message: "Database not ready" });
    }

    // Fixed salaries (workersalaries)
    const fixed = await dbInst.collection("workersalaries").find({ project_id: projectId }).toArray();

    // Hourly records
    const hourly = await dbInst.collection("hourlyprojectrecords").find({ project_id: projectId }).toArray();

    const fixedMapped = fixed.map((ws: any) => ({
      project_id: project.project_id,
      project_name: project.project_name,
      sheet_name: ws.sheet_name ?? project.sheet_name ?? "",
      profile_name: project.profile_name,
      worker_name: ws.worker_name,
      salary: ws.salary,
      entries: ws.no_of_entries ?? ws.entries ?? null,
      profile_debit: ws.profile_debit ?? null,
      company: project.company ?? "",
    }));

    const hourlyMapped = hourly.map((h: any) => ({
      project_id: project.project_id,
      project_name: project.project_name,
      sheet_name: "Hourly Project",
      profile_name: project.profile_name,
      worker_name: h.worker_name,
      salary: h.salary,
      entries: h.no_of_entries ?? null,
      profile_debit: null,
      company: project.company ?? "",
    }));

    const combined = [...fixedMapped, ...hourlyMapped];

    res.json({ success: true, data: combined });
  } catch (err) {
    console.error("Error fetching project payroll:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};


// Approval Logic for projects
const normalizeName = (name: string) =>
  name
    ?.normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, "")
    .replace(/[^a-z0-9]/gi, "")
    .toLowerCase();

// Single Entry projects approval logic
export const approveSingleEntryProject = async (
  req: Request,
  res: Response
) => {
  try {
    const { projectId, salaries: providedSalaries } = req.body as {
      projectId: string;
      salaries?: { worker: string; salary: number }[];
    };

    if (!projectId) return res.status(400).json({ success: false, message: 'projectId is required' });

    const project = await Project.findOne({ project_id: projectId });
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    const WorkerSalaryCollection = db.collection("workersalaries");
    const RevisedWorkerSalaryCollection = db.collection("revised_worker_salaries");

    // If client provided salaries explicitly, use them (useful when ProjectData isn't available)
    if (Array.isArray(providedSalaries) && providedSalaries.length > 0) {
      const total = providedSalaries.reduce((s, x) => s + Number(x.salary || 0), 0);

      for (const { worker, salary } of providedSalaries) {
        const existing = await WorkerSalaryCollection.findOne({ worker_name: worker, project_id: projectId }) as any;
        if (existing && typeof existing.profile_debit === 'string') {
          const parsed = Number(existing.profile_debit);
          await WorkerSalaryCollection.updateOne({ worker_name: worker, project_id: projectId }, { $set: { profile_debit: isNaN(parsed) ? 0 : parsed } });
        }

        await WorkerSalaryCollection.updateOne(
          { worker_name: worker, project_id: projectId },
          { $set: { salary, profile_debit: total } },
          { upsert: true }
        );
      }

      await Project.updateOne({ project_id: projectId }, { status: "completed" });
      return res.json({ success: true, message: 'Single entry project approved (from provided salaries)' });
    }

    // Otherwise, attempt the original ProjectData-driven flow
    const projectData = (await ProjectData.findOne({ project_id: projectId })) as any;
    if (!projectData) {
      return res.status(400).json({ success: false, message: 'Project data not available for single-entry approval. Provide salaries in request body as { salaries: [{ worker, salary }] }.' });
    }

    const users = await User.find({}, { name: 1 });
    const userMap: Record<string, string> = {};
    users.forEach(u => (userMap[normalizeName(u.name)] = u.name));

    const salaries: Record<string, number> = {};
    const entryCounts: Record<string, number> = {};

    projectData.row_data.forEach((row: any[]) => {
      const raw = row[row.length - 1] as string | undefined;
      if (!raw) return;

      raw.split(",").forEach((name: string) => {
        const real = userMap[normalizeName(name)];
        if (!real) return;

        salaries[real] = (salaries[real] || 0) + (project.price_worker_one ?? 0);
        entryCounts[real] = (entryCounts[real] || 0) + 1;
      });
    });

    const totalEntries = Object.values(entryCounts).reduce<number>((a, b) => a + b, 0);
    const profileDebit = totalEntries * (project.profile_price_per_entry ?? 0);

    // If the project is already completed (treated as paid), create payroll adjustments
    // instead of directly overwriting workersalaries.
    if (project.status === "completed") {
      try {
        await applyRevisionInternal({ projectId, reason: 'Approved via admin (single-entry)', applyMode: 'applied', created_by: (req as any)?.user?.name || null });
        await Project.updateOne({ project_id: projectId }, { status: "completed" });
        return res.json({ success: true, message: 'Single entry project approved and adjustments created (project already completed)' });
      } catch (e) {
        console.error('Error creating adjustments for completed project:', e);
        return res.status(500).json({ success: false, message: 'Failed to create adjustments for completed project' });
      }
    }

    for (const worker of Object.keys(salaries)) {
      const salary = salaries[worker];
      const entries = entryCounts[worker];

      const existing = await WorkerSalaryCollection.findOne({ worker_name: worker, project_id: projectId }) as any;
      if (existing && typeof existing.profile_debit === 'string') {
        const parsed = Number(existing.profile_debit);
        await WorkerSalaryCollection.updateOne({ worker_name: worker, project_id: projectId }, { $set: { profile_debit: isNaN(parsed) ? 0 : parsed } });
      }

      if (!project.is_revised) {
        await WorkerSalaryCollection.updateOne(
          { worker_name: worker, project_id: projectId },
          { $set: { salary, profile_debit: profileDebit, no_of_entries: entries } },
          { upsert: true }
        );
      } else {
        const old = await WorkerSalaryCollection.findOne({ worker_name: worker, project_id: projectId }) as any;
        const diffSalary = salary - (old?.salary || 0);
        const diffEntries = entries - (old?.no_of_entries || 0);

        if (diffSalary !== 0 || diffEntries !== 0) {
          await RevisedWorkerSalaryCollection.updateOne(
            { worker_name: worker, project_id: projectId },
            { $inc: { revised_salary: diffSalary, revised_profile_debit: profileDebit, no_of_entries: diffEntries } },
            { upsert: true }
          );
        }
      }
    }

    await Project.updateOne({ project_id: projectId }, { status: "completed" });
    res.json({ success: true, message: "Single entry project approved" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
};

// Approve MultiEntry Projects Logic
export const approveMultiEntryProject = async (
  req: Request,
  res: Response
) => {
  try {
    const { projectId } = req.body;

    // Fetch project and project data
    const project = await Project.findOne({ project_id: projectId });
    const projectData = await ProjectData.findOne({ project_id: projectId }) as any;

    if (!project || !projectData) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    // Determine number of entries based on project option
    const entryCountMap: Record<string, number> = {
      "Double Entry": 2,
      "Triple Entry": 3,
      "Fourth Entry": 4,
      "Fifth Entry": 5,
    };

    const numEntries = entryCountMap[project.fixed_option ?? ""];
    if (!numEntries) {
      return res.status(400).json({ success: false, message: "Invalid multi-entry option" });
    }

    // Map worker column index → price
    const priceMap = [
      project.price_worker_one ?? 0,
      project.price_worker_two ?? 0,
      project.price_worker_three ?? 0,
      project.price_worker_four ?? 0,
      project.price_worker_five ?? 0,
    ];

    // Load users and create normalized map
    const users = await User.find({}, { name: 1 });
    const userMap: Record<string, string> = {};
    users.forEach(u => {
      userMap[normalizeName(u.name)] = u.name;
    });

    // Initialize salary and entry counts
    const salaries: Record<string, number> = {};
    const entryCounts: Record<string, number> = {};

    // Process each row safely
    if (Array.isArray(projectData.row_data) && projectData.row_data.length > 0) {
      const allRows = projectData.row_data as any[][];

      // Try to detect worker columns from header (first row saved by sync)
      const headerRow = Array.isArray(allRows[0]) ? allRows[0].map((h: any) => String(h || "")) : [];
      const headerNormalized = headerRow.map((h: string) => h.trim().toLowerCase());

      const workerColumnNames = [
        "Worker One",
        "Worker Two",
        "Worker Three",
        "Worker Four",
        "Worker Five",
      ].slice(0, numEntries);

      const workerIndices = workerColumnNames.map((w) => headerNormalized.indexOf((w || "").trim().toLowerCase()));

      const foundHeaderCols = workerIndices.some((idx) => idx >= 0);

      // If header columns found, use those indices; otherwise fall back to previous "last N columns" approach
      if (foundHeaderCols) {
        // iterate data rows (skip header)
        for (let r = 1; r < allRows.length; r++) {
          const row = allRows[r] || [];
          for (let i = 0; i < workerIndices.length; i++) {
            const colIndex = workerIndices[i];
            if (colIndex < 0 || colIndex >= row.length) continue;
            const rawCell = row[colIndex];
            if (!rawCell) continue;

            // allow comma-separated names in a cell
            const names = String(rawCell).split(",").map(s => s.trim()).filter(Boolean);
            for (const name of names) {
              const normalized = normalizeName(name);
              const realUser = userMap[normalized];
              if (!realUser) continue;
              const price = priceMap[i] ?? 0;
              salaries[realUser] = (salaries[realUser] || 0) + price;
              entryCounts[realUser] = (entryCounts[realUser] || 0) + 1;
            }
          }
        }
      } else {
        // Fallback: use last `numEntries` columns of each row (legacy behavior)
        allRows.forEach((row: any[]) => {
          if (!row || !Array.isArray(row)) return;
          const startIndex = Math.max(0, row.length - numEntries);
          for (let i = 0; i < numEntries; i++) {
            const colIndex = startIndex + i;
            if (colIndex >= row.length) continue;
            const rawName = row[colIndex];
            if (!rawName) continue;
            const normalized = normalizeName(rawName);
            const realUser = userMap[normalized];
            if (!realUser) continue;
            const price = priceMap[i] ?? 0;
            salaries[realUser] = (salaries[realUser] || 0) + price;
            entryCounts[realUser] = (entryCounts[realUser] || 0) + 1;
          }
        });
      }
    }

    // Calculate total profile debit
    const profileDebit = Object.values(salaries).reduce((a, b) => a + b, 0);

    // If project already marked completed (treated as paid), create payroll adjustments
    if (project.status === "completed") {
      try {
        await applyRevisionInternal({ projectId, reason: 'Approved via admin (multi-entry)', applyMode: 'applied', created_by: (req as any)?.user?.name || null });
        await Project.updateOne({ project_id: projectId }, { status: "completed" });
        return res.json({ success: true, message: 'Multi-entry project approved and adjustments created (project already completed)' });
      } catch (e) {
        console.error('Error creating adjustments for completed multi-entry project:', e);
        return res.status(500).json({ success: false, message: 'Failed to create adjustments for completed project' });
      }
    }

    const WorkerSalaryCollection = db.collection("workersalaries");
    const RevisedWorkerSalaryCollection = db.collection("revised_worker_salaries");

    // Update salaries in DB
    for (const worker of Object.keys(salaries)) {
      const salary = salaries[worker];
      const entries = entryCounts[worker];

      const existing = await WorkerSalaryCollection.findOne({
        worker_name: worker,
        project_id: projectId,
      }) as any;

      if (!project.is_revised) {
        // Normal project → overwrite
        await WorkerSalaryCollection.updateOne(
          { worker_name: worker, project_id: projectId },
          {
            $set: {
              salary,
              no_of_entries: entries,
              profile_debit: profileDebit,
            },
          },
          { upsert: true }
        );
      } else {
        // Revised project → calculate diffs
        const oldSalary = existing?.salary || 0;
        const oldEntries = existing?.no_of_entries || 0;

        const diffSalary = salary - oldSalary;
        const diffEntries = entries - oldEntries;

        if (diffSalary !== 0 || diffEntries !== 0) {
          await RevisedWorkerSalaryCollection.updateOne(
            { worker_name: worker, project_id: projectId },
            {
              $inc: {
                revised_salary: diffSalary,
                revised_profile_debit: diffSalary,
                no_of_entries: diffEntries,
              },
            },
            { upsert: true }
          );
        }
      }
    }

    // Mark project as completed
    await Project.updateOne({ project_id: projectId }, { status: "completed" });

    res.json({
      success: true,
      message: project.is_revised
        ? "Revised multi-entry project recalculated and approved"
        : "Multi-entry project recalculated and approved",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Approval failed" });
  }
};





// Lumpsum Project Approval Logic
export const approveLumpsumProject = async (
  req: Request,
  res: Response
) => {
  try {
    const { projectId, salaries, lumpsumPrice }: {
      projectId: string;
      salaries: { worker: string; salary: number }[];
      lumpsumPrice: number;
    } = req.body;

    // Ensure numbers and allow small floating point tolerances
    const total = salaries.reduce<number>((s, x) => s + Number(x.salary || 0), 0);
    const diff = Math.abs(total - Number(lumpsumPrice || 0));
    const EPS = 0.01; // allow cent-level rounding differences
    if (salaries.length === 0) {
      return res.status(400).json({ success: false, message: "No salaries provided for lumpsum approval." });
    }
    if (diff > EPS) {
      return res.status(400).json({ success: false, message: `Salaries total ${total} does not match lumpsumPrice ${lumpsumPrice}.` });
    }

    const WorkerSalaryCollection = db.collection("workersalaries");

    for (const { worker, salary } of salaries) {
      // Sanitize any existing profile_debit field stored as string
      const existing = await WorkerSalaryCollection.findOne({ worker_name: worker, project_id: projectId }) as any;
      if (existing && typeof existing.profile_debit === 'string') {
        const parsed = Number(existing.profile_debit);
        await WorkerSalaryCollection.updateOne({ worker_name: worker, project_id: projectId }, { $set: { profile_debit: isNaN(parsed) ? 0 : parsed } });
      }

      await WorkerSalaryCollection.updateOne(
        { worker_name: worker, project_id: projectId },
        { $set: { salary, profile_debit: lumpsumPrice } },
        { upsert: true }
      );
    }

    await Project.updateOne({ project_id: projectId }, { status: "completed" });

    res.json({ success: true, message: "Lumpsum project approved" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
};


// Reject a project
export const rejectProject = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.body;

    if (!projectId) {
      return res.status(400).json({
        success: false,
        message: "Project ID is required.",
      });
    }

    // Find project
    const project = await Project.findOne({ project_id: projectId });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found.",
      });
    }

    // Reset project status and clear assignment
    project.status = "pending";
    project.assigned_to = "";
    project.assigned_to_ids = "";

    await project.save();

    return res.json({
      success: true,
      message: "Project rejected successfully.",
    });
  } catch (error) {
    console.error("Error rejecting project:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while rejecting project.",
    });
  }
};


// Update a payroll entry (project + worker salary row)
export const updatePayrollEntry = async (req: Request, res: Response) => {
  try {
    const {
      project_id,
      project_name,
      sheet_name,
      profile_name,
      worker_name,
      original_worker_name,
      salary,
      entries,
      profile_debit,
      company,
    } = req.body;

    if (!project_id) {
      return res.status(400).json({ success: false, message: 'project_id is required' });
    }

    // Fetch project
    const project = await Project.findOne({ project_id });
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    // Update project-level fields if provided
    const projectUpdate: any = {};
    if (project_name !== undefined) projectUpdate.project_name = project_name;
    if (sheet_name !== undefined) projectUpdate.sheet_name = sheet_name;
    if (profile_name !== undefined) projectUpdate.profile_name = profile_name;
    if (company !== undefined) projectUpdate.company = company;

    if (Object.keys(projectUpdate).length > 0) {
      await Project.updateOne({ project_id }, projectUpdate);
    }

    // Update worker salary row in workersalaries collection
    const WorkerSalaryCollection = db.collection('workersalaries');

    const searchWorker = original_worker_name || worker_name;
    if (!searchWorker) {
      return res.status(400).json({ success: false, message: 'worker_name or original_worker_name is required' });
    }

    const existing = await WorkerSalaryCollection.findOne({ project_id, worker_name: searchWorker });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Worker salary row not found' });
    }

    const updateRow: any = {};
    if (worker_name !== undefined) updateRow.worker_name = worker_name;
    if (salary !== undefined) updateRow.salary = Number(salary);
    if (entries !== undefined) updateRow.no_of_entries = Number(entries);
    if (profile_debit !== undefined) updateRow.profile_debit = Number(profile_debit);

    if (Object.keys(updateRow).length > 0) {
      await WorkerSalaryCollection.updateOne({ project_id, worker_name: searchWorker }, { $set: updateRow });
    }

    return res.json({ success: true, message: 'Payroll row updated successfully' });
  } catch (err: any) {
    console.error('Error updating payroll entry:', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

// -------------------- 🔹 PAYROLL INFONAV BWP --------------------
export const getPayrollInfonavBwp = async (req: Request, res: Response) => {
  try {
    const { start_date, end_date } = req.query;

    if (!start_date || !end_date) {
      return res
        .status(400)
        .json({ success: false, message: "Start and end date are required." });
    }

    const start = new Date(start_date as string);
    const end = new Date(end_date as string);
    end.setHours(23, 59, 59, 999);

    const Projects = db.collection("projects");
    const Hourly = db.collection("hourlyprojectrecords");

    // Fixed Projects: only BWP
    const fixedPipeline: any[] = [
      {
        $match: {
          company: { $regex: /^infonav$/i },
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
      { $match: { "ws.worker_name": { $regex: /^BWP$/i } } },
      {
        $addFields: {
          ws_salary_num: {
            $convert: { input: "$ws.salary", to: "double", onError: 0, onNull: 0 },
          },
          ws_entries_num: {
            $convert: { input: "$ws.no_of_entries", to: "double", onError: 0, onNull: 0 },
          },
        },
      },
      {
        $group: {
          _id: "$project_id",
          project_id: { $first: "$project_id" },
          project_name: { $first: "$project_name" },
          worker_name: { $first: "$ws.worker_name" },
          price_per_entry: { $first: "$price_worker_one" },
          sheet_name: { $first: "$sheet_name" },
          profile_name: { $first: "$profile_name" },
          entries: { $sum: "$ws_entries_num" },
          salary: { $sum: "$ws_salary_num" },
          company: { $first: "$company" },
          type: { $first: "Fixed" },
        },
      },
      { $sort: { project_id: 1 } },
    ];

    const fixedResults = await Projects.aggregate(fixedPipeline).toArray();

    // Hourly Projects: only BWP
    const hourlyPipeline: any[] = [
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
          "p.company": { $regex: /^infonav$/i },
          "p.status": "completed",
          "p.updated_at": { $gte: start, $lte: end },
          worker_name: { $regex: /^BWP$/i },
        },
      },
      {
        $addFields: {
          salary_num: { $convert: { input: "$salary", to: "double", onError: 0, onNull: 0 } },
          entries_num: { $convert: { input: "$runned_hours", to: "double", onError: 0, onNull: 0 } },
        },
      },
      {
        $group: {
          _id: "$project_id",
          project_id: { $first: "$project_id" },
          project_name: { $first: "$p.project_name" },
          worker_name: { $first: "$worker_name" },
          price_per_entry: { $first: null },
          sheet_name: { $first: null },
          profile_name: { $first: "$p.profile_name" },
          entries: { $sum: "$entries_num" },
          salary: { $sum: "$salary_num" },
          company: { $first: "$p.company" },
          type: { $first: "Hourly" },
        },
      },
      { $sort: { project_id: 1 } },
    ];

    const hourlyResults = await Hourly.aggregate(hourlyPipeline).toArray();

    res.json({ success: true, data: [...fixedResults, ...hourlyResults] });
  } catch (err: any) {
    console.error("Infonav BWP payroll error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// -------------------- 🔹 PAYROLL FZ BWP --------------------
export const getPayrollFzBwp = async (req: Request, res: Response) => {
  try {
    const { start_date, end_date } = req.query;

    if (!start_date || !end_date) {
      return res
        .status(400)
        .json({ success: false, message: "Start and end date are required." });
    }

    const start = new Date(start_date as string);
    const end = new Date(end_date as string);
    end.setHours(23, 59, 59, 999);

    const Projects = db.collection("projects");
    const Hourly = db.collection("hourlyprojectrecords");

    // Fixed Projects: only BWP for freelancerszone
    const fixedPipeline: any[] = [
      {
        $match: {
          company: { $regex: /^freelancerszone$/i },
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
      { $match: { "ws.worker_name": { $regex: /^BWP$/i } } },
      {
        $addFields: {
          ws_salary_num: {
            $convert: { input: "$ws.salary", to: "double", onError: 0, onNull: 0 },
          },
          ws_entries_num: {
            $convert: { input: "$ws.no_of_entries", to: "double", onError: 0, onNull: 0 },
          },
        },
      },
      {
        $group: {
          _id: "$project_id",
          project_id: { $first: "$project_id" },
          project_name: { $first: "$project_name" },
          worker_name: { $first: "$ws.worker_name" },
          price_per_entry: { $first: "$price_worker_one" },
          sheet_name: { $first: "$sheet_name" },
          profile_name: { $first: "$profile_name" },
          entries: { $sum: "$ws_entries_num" },
          salary: { $sum: "$ws_salary_num" },
          company: { $first: "$company" },
          type: { $first: "Fixed" },
        },
      },
      { $sort: { project_id: 1 } },
    ];

    const fixedResults = await Projects.aggregate(fixedPipeline).toArray();

    // Hourly Projects: only BWP
    const hourlyPipeline: any[] = [
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
          "p.company": { $regex: /^freelancerszone$/i },
          "p.status": "completed",
          "p.updated_at": { $gte: start, $lte: end },
          worker_name: { $regex: /^BWP$/i },
        },
      },
      {
        $addFields: {
          salary_num: { $convert: { input: "$salary", to: "double", onError: 0, onNull: 0 } },
          entries_num: { $convert: { input: "$runned_hours", to: "double", onError: 0, onNull: 0 } },
        },
      },
      {
        $group: {
          _id: "$project_id",
          project_id: { $first: "$project_id" },
          project_name: { $first: "$p.project_name" },
          worker_name: { $first: "$worker_name" },
          price_per_entry: { $first: null },
          sheet_name: { $first: null },
          profile_name: { $first: "$p.profile_name" },
          entries: { $sum: "$entries_num" },
          salary: { $sum: "$salary_num" },
          company: { $first: "$p.company" },
          type: { $first: "Hourly" },
        },
      },
      { $sort: { project_id: 1 } },
    ];

    const hourlyResults = await Hourly.aggregate(hourlyPipeline).toArray();

    res.json({ success: true, data: [...fixedResults, ...hourlyResults] });
  } catch (err: any) {
    console.error("FZ BWP payroll error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};


/* -------------------- 🔹 Mark Project Completed -------------------- */
export const markProjectCompleted = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.body;

    if (!projectId) {
      return res.status(400).json({ success: false, message: "Project ID is required" });
    }

    const project = await Project.findOneAndUpdate(
      { project_id: projectId },
      { status: "completed", original_completed_at: new Date() },
      { new: true }
    );

    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error marking project as completed:", error);
    res.status(500).json({ success: false, message: "Failed to mark project as completed" });
  }
};

// Mark project as pending for revision: snapshot current workersalaries and set project to pending
export const markProjectPendingForRevision = async (req: Request, res: Response) => {
  try {
    const { projectId, reason, performedBy } = req.body;
    if (!projectId) return res.status(400).json({ success: false, message: 'projectId required' });

    const project = await Project.findOne({ project_id: projectId });
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    // Snapshot current workersalaries
    const WorkerSalaryCollection = db.collection('workersalaries');
    const rows = await WorkerSalaryCollection.find({ project_id: projectId }).toArray();

    const worker_diffs = (rows || []).map((r: any) => ({
      worker_name: r.worker_name,
      old_salary: Number(r.salary || 0),
      new_salary: Number(r.salary || 0),
      diff: 0,
      old_entries: Number(r.no_of_entries || 0),
      new_entries: Number(r.no_of_entries || 0),
    }));

    // Create a ProjectRevision snapshot record
    await ProjectRevision.create({ project_id: projectId, created_by: performedBy || null, summary: 'Snapshot before revision', worker_diffs, notes: reason || '' });

    // Mark project as revised and pending
    project.is_revised = true;
    project.status = 'pending';
    if (!project.original_completed_at) project.original_completed_at = new Date();
    await project.save();

    res.json({ success: true, message: 'Project marked pending for revision and snapshot saved' });
  } catch (err) {
    console.error('Error marking project pending for revision:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
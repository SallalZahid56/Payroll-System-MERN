import { Request, Response } from "express";
import Project from "../models/Project";

// Manager Add Project Route
export const addProject = async (req: Request, res: Response) => {
  try {
    const data = req.body;

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

    for (const field of required) {
      if (!data[field]) {
        return res
          .status(400)
          .json({ success: false, message: `${field} is required.` });
      }
    }

    // Convert arrays → strings (because schema uses type: String)
    const shiftString = Array.isArray(data.shift)
      ? data.shift.join(", ")
      : data.shift;

    const projectColumnsString = Array.isArray(data.projectColumns)
      ? data.projectColumns.join(", ")
      : data.projectColumns || "";

    const projectData = {
      project_id: data.projectId,
      project_name: data.projectName,
      profile_name: data.profileName,
      sheet_name: data.sheetName,

      shift: shiftString,
      fixed_option: data.fixedOption,
      work_type: data.workType,
      company: data.company,

      project_type: "fixed",

      instructions: data.instructions || "",
      project_columns: projectColumnsString,

      google_sheet_url: data.googleSheetUrl || "",
      total_entries: data.totalEntries || 0,

      // Manager prices are always null or 0
      lumpsum_price: null,
      price_worker_one: null,
      price_worker_two: null,
      price_worker_three: null,
      price_worker_four: null,
      price_worker_five: null,
      profile_price_per_entry: null,

      deadline: data.deadline ? new Date(data.deadline) : null,
    };

    const newProject = new Project(projectData);
    await newProject.save();

    return res.status(201).json({
      success: true,
      message: "Project added by manager!",
      project: newProject,
    });
  } catch (error: any) {
    console.error("Error in manager project creation:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// To fetch Manager Assigned Projects 
export const getAssignedProjectsForManager = async (req: Request, res: Response) => {
  try {
    const managerName = (req as any)?.user?.name;

    if (!managerName) {
      return res.status(401).json({ message: "Unauthorized: Manager not logged in" });
    }

    const projects = await Project.find({
      assigned_to: { $ne: null },
      status: "assigned",
      project_type: "fixed",
      $or: [
        { shift: "Both" },
        { shift: { $regex: managerName, $options: "i" } }
      ],
    })
    .sort({ created_at: -1 })
    .lean();

    const parsedProjects = projects.map((p: any) => ({
      ...p,
      assigned_to_ids: p.assigned_to_ids
        ? p.assigned_to_ids.split(",").map((id: string) => id.trim())
        : [],
    }));

    return res.json({ success: true, projects: parsedProjects || [] });

  } catch (err: any) {
    console.error("❌ Error fetching manager assigned projects:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ----------------------------
// Get Unassigned Projects for Manager
// ----------------------------
export const getUnassignedProjectsForManager = async (req: Request, res: Response) => {
  try {
    const managerName = (req as any).user?.name; // From JWT middleware

    if (!managerName) {
      return res.status(401).json({ message: "Unauthorized: Manager not logged in" });
    }

    // Fetch projects where assigned_to is empty/null and shift matches manager or 'Both'
    const projects = await Project.find({
      assigned_to: { $in: [null, ""] },
      project_type: "fixed",
      $or: [
        { shift: "Both" },
        { shift: { $regex: managerName, $options: "i" } },
      ],
    }).sort({ created_at: -1 });

    // Parse assigned_to_ids (comma-separated → array)
    const parsedProjects = projects.map((p: any) => ({
      ...p._doc,
      assigned_to_ids: p.assigned_to_ids
        ? p.assigned_to_ids.split(",").map((id: string) => id.trim())
        : [],
    }));

    res.json({ success: true, projects: parsedProjects });

  } catch (err: any) {
    console.error("❌ Error fetching manager unassigned projects:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};





// ----------------------------
// Get Hourly Assigned Projects for Manager
// ----------------------------
export const getHourlyAssignedProjects = async (req: Request, res: Response) => {
  try {
    const managerName = (req as any).user?.name;

    if (!managerName) {
      return res.status(401).json({ message: "Unauthorized: Manager not logged in" });
    }

    const projects = await Project.find({
      project_type: "hourly",
      status: "assigned",          // ✅ fetch ONLY assigned projects
      assigned_to: { $ne: null },  // must have someone assigned
      $or: [
        { shift: "Both" },
        { shift: { $regex: managerName, $options: "i" } }
      ]
    })
      .sort({ created_at: -1 })
      .lean();

    const parsedProjects = projects.map((p: any) => ({
      ...p,
      assigned_to_ids: p.assigned_to_ids
        ? p.assigned_to_ids.split(",").map((id: string) => id.trim())
        : []
    }));

    return res.json({ success: true, projects: parsedProjects });
  } catch (err: any) {
    console.error("❌ Error fetching hourly assigned projects:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};




// ----------------------------
// Get Hourly Unassigned Projects
// ----------------------------
export const getHourlyUnassignedProjects = async (req: Request, res: Response) => {
  try {
    const managerName = (req as any).user?.name;

    if (!managerName) {
      return res.status(401).json({ message: "Unauthorized: Manager not logged in" });
    }

    const projects = await Project.find({
      assigned_to: { $in: [null, ""] },
      project_type: "hourly",
      $or: [
        { shift: "Both" },
        { shift: { $regex: managerName, $options: "i" } },
      ],
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
    console.error("❌ Error fetching hourly unassigned projects:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};






// ----------------------------
// Manager Add Hourly Project
// ----------------------------
export const addHourlyProject = async (req: Request, res: Response) => {
  try {
    const {
      projectId,
      projectName,
      profileName,
      sheetName,
      projectType,
      workType,
      shift,
      instructions,
      projectColumns,
      company,
      googleSheetUrl,
    } = req.body;

    // Validate required fields
    if (!projectId || !projectName || !profileName || !sheetName || !workType || !shift || !company) {
      return res.status(400).json({ success: false, message: "Missing required fields." });
    }

    // Convert arrays to comma-separated strings
    const shiftString = Array.isArray(shift) ? shift.join(", ") : shift;
    const projectColumnsString =
      Array.isArray(projectColumns) && projectColumns.length > 0
        ? projectColumns.join(", ")
        : null;

    // Create new project
    const newProject = new Project({
      project_id: projectId,
      project_name: projectName,
      profile_name: profileName,
      sheet_name: sheetName,
      project_type: projectType || "hourly",
      work_type: workType,
      shift: shiftString,
      instructions: instructions || "",
      project_columns: projectColumnsString || null,
      company: company,
      google_sheet_url: googleSheetUrl || "",
      
      // Hourly-specific fields always null for manager
      profile_price_per_entry: null,
      price_per_hour: null,
      total_entries: null,
      lumpsum_price: null,
      price_worker_one: null,
      price_worker_two: null,
      price_worker_three: null,
      price_worker_four: null,
      price_worker_five: null,
      deadline: null,
    });

    await newProject.save();

    res.status(201).json({ success: true, project: newProject });
  } catch (error: any) {
    console.error("Manager add-hourly-project error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
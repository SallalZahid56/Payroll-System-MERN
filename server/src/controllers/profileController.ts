import { Request, Response } from "express";
import Project from "../models/Project"; 

export const getAssignedProjectsForProfile = async (req: Request, res: Response) => {
  try {
    const profileName = (req as any).user?.name; // From JWT

    if (!profileName) {
      return res.status(401).json({ message: "Unauthorized: Profile not logged in" });
    }

    const projects = await Project.find({
      assigned_to: { $ne: null },
      status: "assigned",
      project_type: "fixed",
      profile_name: profileName, // ✅ filter by profile_name
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
    console.error("❌ Error fetching profile assigned projects:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};


export const getUnassignedProjectsForProfile = async (req: Request, res: Response) => {
  try {
    const profileName = (req as any).user?.name;

    if (!profileName) {
      return res.status(401).json({ message: "Unauthorized: Profile not logged in" });
    }

    const projects = await Project.find({
      assigned_to: { $in: [null, ""] },
      project_type: "fixed",
      profile_name: profileName, // ✅ filter by profile_name
    }).sort({ created_at: -1 });

    const parsedProjects = projects.map((p: any) => ({
      ...p._doc,
      assigned_to_ids: p.assigned_to_ids
        ? p.assigned_to_ids.split(",").map((id: string) => id.trim())
        : [],
    }));

    res.json({ success: true, projects: parsedProjects });

  } catch (err: any) {
    console.error("❌ Error fetching profile unassigned projects:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};



export const getHourlyAssignedProjectsForProfile = async (req: Request, res: Response) => {
  try {
    const profileName = (req as any).user?.name;

    if (!profileName) {
      return res.status(401).json({ message: "Unauthorized: Profile not logged in" });
    }

    const projects = await Project.find({
      project_type: "hourly",
      status: "assigned",
      assigned_to: { $ne: null },
      profile_name: profileName, // ✅ filter by profile_name
    })
      .sort({ created_at: -1 })
      .lean();

    const parsedProjects = projects.map((p: any) => ({
      ...p,
      assigned_to_ids: p.assigned_to_ids
        ? p.assigned_to_ids.split(",").map((id: string) => id.trim())
        : [],
    }));

    return res.json({ success: true, projects: parsedProjects });
  } catch (err: any) {
    console.error("❌ Error fetching hourly assigned projects for profile:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};



export const getHourlyUnassignedProjectsForProfile = async (req: Request, res: Response) => {
  try {
    const profileName = (req as any).user?.name;

    if (!profileName) {
      return res.status(401).json({ message: "Unauthorized: Profile not logged in" });
    }

    const projects = await Project.find({
      assigned_to: { $in: [null, ""] },
      project_type: "hourly",
      profile_name: profileName, // ✅ filter by profile_name
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
    console.error("❌ Error fetching hourly unassigned projects for profile:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

import { Request, Response } from "express";
import Project from "../models/Project";


/* ============================
   GET PENDING PROJECTS
   Assigned to Logged-in User
============================ */
export const getPendingAssignedProjects = async (
  req: Request,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Not logged in" });
    }

    // ✅ USE USER ID (not name)
    const loggedInUserId = req.user.id;

    const projects = await Project.find({
      assigned_to: {
        $regex: new RegExp(`(^|,\\s*)${loggedInUserId}(,|$)`),
      },
      status: "assigned", // or "pending" if needed
    }).sort({ createdAt: -1 });

    return res.json({ projects });

  } catch (error) {
    console.error("Error fetching assigned projects:", error);
    res.status(500).json({ message: "Server error" });
  }
};


/* ============================
   SUBMIT PROJECT
   Set status to "submitted"
============================ */
export const submitProject = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Not logged in" });
    }

    const projectId = req.params.projectId;
    if (!projectId) {
      return res.status(400).json({ message: "Project ID is required." });
    }

    // ✅ Update project status to 'submitted' only if assigned to this user
    const project = await Project.findOne({
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

  } catch (error) {
    console.error("Error submitting project:", error);
    res.status(500).json({ message: "Server error" });
  }
};
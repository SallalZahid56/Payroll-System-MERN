import express from "express";
import { addProject, addHourlyProject, getAssignedProjectsForManager, getUnassignedProjectsForManager, getHourlyAssignedProjects, getHourlyUnassignedProjects } from "../controllers/managerController";
import { authManager } from "../middleware/authManager";

const router = express.Router();

// Manager add project route
router.post("/add-project", addProject);
router.post("/add-hourly-project", authManager, addHourlyProject);
router.get("/get-assigned-projects", authManager, getAssignedProjectsForManager);
router.get("/get-unassigned-projects", authManager, getUnassignedProjectsForManager);
// Hourly assigned projects
router.get("/get-hourly-assigned-projects", authManager, getHourlyAssignedProjects);
// Hourly unassigned projects
router.get("/get-hourly-unassigned-projects", authManager, getHourlyUnassignedProjects);




export default router;
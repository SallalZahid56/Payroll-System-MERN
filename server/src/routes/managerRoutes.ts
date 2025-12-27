import express from "express";
import { addProject, addHourlyProject, getAssignedProjectsForManager, getUnassignedProjectsForManager, getHourlyAssignedProjects, getHourlyUnassignedProjects, getPendingAssignedProjects } from "../controllers/managerController";
import { authManager } from "../middleware/authManager";
import { authProfile } from "../middleware/authProfile";

const router = express.Router();

// Manager add project route
router.post("/add-project", addProject);
router.post("/add-hourly-project", authManager, addHourlyProject);
router.get("/get-assigned-projects", authManager, getAssignedProjectsForManager);
router.get("/get-unassigned-projects", authManager, getUnassignedProjectsForManager);
router.get("/get-hourly-assigned-projects", authManager, getHourlyAssignedProjects);
router.get("/get-hourly-unassigned-projects", authManager, getHourlyUnassignedProjects);
router.get("/get-pending-projects", authProfile, getPendingAssignedProjects);



export default router;
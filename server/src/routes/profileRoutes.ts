import express from "express";
import { getAssignedProjectsForProfile, getUnassignedProjectsForProfile, getHourlyAssignedProjectsForProfile, getHourlyUnassignedProjectsForProfile } from "../controllers/profileController";
import { authProfile } from "../middleware/authProfile";

const router = express.Router();

// Protected routes, only accessible by logged-in profiles
router.use(authProfile);

router.get("/get-assigned-projects", getAssignedProjectsForProfile);
router.get("/get-unassigned-projects", getUnassignedProjectsForProfile);
router.get("/get-hourly-assigned-projects", getHourlyAssignedProjectsForProfile);
router.get("/get-hourly-unassigned-projects", getHourlyUnassignedProjectsForProfile);

export default router;
import express from "express";
import { authUser } from "../middleware/authUser";
import { getPendingAssignedProjects, submitProject } from "../controllers/userController";

const router = express.Router();

router.get(
  "/get-pending-projects",
  authUser,
  getPendingAssignedProjects
);
router.put("/submit-project/:projectId", authUser, submitProject);

export default router;

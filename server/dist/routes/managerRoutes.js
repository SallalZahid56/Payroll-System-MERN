"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const managerController_1 = require("../controllers/managerController");
const authManager_1 = require("../middleware/authManager");
const router = express_1.default.Router();
// Manager add project route
router.post("/add-project", managerController_1.addProject);
router.post("/add-hourly-project", authManager_1.authManager, managerController_1.addHourlyProject);
router.get("/get-assigned-projects", authManager_1.authManager, managerController_1.getAssignedProjectsForManager);
router.get("/get-unassigned-projects", authManager_1.authManager, managerController_1.getUnassignedProjectsForManager);
// Hourly assigned projects
router.get("/get-hourly-assigned-projects", authManager_1.authManager, managerController_1.getHourlyAssignedProjects);
// Hourly unassigned projects
router.get("/get-hourly-unassigned-projects", authManager_1.authManager, managerController_1.getHourlyUnassignedProjects);
exports.default = router;

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const profileController_1 = require("../controllers/profileController");
const authProfile_1 = require("../middleware/authProfile");
const router = express_1.default.Router();
// Protected routes, only accessible by logged-in profiles
router.use(authProfile_1.authProfile);
router.get("/get-assigned-projects", profileController_1.getAssignedProjectsForProfile);
router.get("/get-unassigned-projects", profileController_1.getUnassignedProjectsForProfile);
router.get("/get-hourly-assigned-projects", profileController_1.getHourlyAssignedProjectsForProfile);
router.get("/get-hourly-unassigned-projects", profileController_1.getHourlyUnassignedProjectsForProfile);
exports.default = router;

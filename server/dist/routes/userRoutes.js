"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authUser_1 = require("../middleware/authUser");
const userController_1 = require("../controllers/userController");
const router = express_1.default.Router();
router.get("/get-pending-projects", authUser_1.authUser, userController_1.getPendingAssignedProjects);
router.put("/submit-project/:projectId", authUser_1.authUser, userController_1.submitProject);
exports.default = router;

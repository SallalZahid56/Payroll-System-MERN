"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authController_1 = require("../controllers/authController");
const router = express_1.default.Router();
router.post("/signup", authController_1.signup);
router.post("/login", authController_1.login);
router.post("/google-signup", authController_1.googleSignup);
router.post("/forgot-password", authController_1.requestPasswordReset);
router.post("/reset-password", authController_1.resetPassword);
exports.default = router;

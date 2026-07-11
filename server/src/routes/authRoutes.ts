import express from "express";
import { signup, login, googleSignup, requestPasswordReset,
  resetPassword, } from "../controllers/authController";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/google-signup", googleSignup);
router.post("/forgot-password", requestPasswordReset);
router.post("/reset-password", resetPassword);

export default router;

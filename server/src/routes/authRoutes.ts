import express from "express";
import { signup, login, googleSignup } from "../controllers/authController";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/google-signup", googleSignup);

export default router;

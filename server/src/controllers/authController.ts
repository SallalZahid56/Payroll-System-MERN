import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/user";
import { OAuth2Client } from "google-auth-library";
import crypto from "crypto";
import { sendResetEmail } from "../utils/sendResetEmail";

const JWT_SECRET = process.env.JWT_SECRET || "secretkey";
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/* ================================
   🧾 USER SIGNUP (Manual)
================================ */
export const signup = async (req: Request, res: Response) => {
  try {
    const { name, email, phone, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "All required fields must be filled" });
    }

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: "Email already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      name,
      email,
      phone,
      password: hashedPassword,
      role: "user",
    });

    const token = jwt.sign(
      { id: newUser._id, name: newUser.name, role: newUser.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(201).json({
      message: "Signup successful",
      token,
      user: { id: newUser._id, name: newUser.name, role: newUser.role },
    });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

/* ================================
   🔐 USER LOGIN
================================ */
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ error: "Email and password are required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "Invalid email or password" });

    if (!user.password) {
      return res.status(400).json({ error: "Please login using Google." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user._id, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      message: "Login successful",
      token,
      user: { id: user._id, name: user.name, role: user.role },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

/* ================================
   🌐 GOOGLE SIGNUP / LOGIN
================================ */
export const googleSignup = async (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: "No token provided" });

    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email)
      return res.status(400).json({ error: "Invalid Google token" });

    const { email, name } = payload;

    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        name: name || email.split("@")[0],
        email,
        googleId: payload.sub,
        role: "user",
      });
    }

    const jwtToken = jwt.sign(
      { id: user._id, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      message: "Google signup/login successful",
      token: jwtToken,
      user: { id: user._id, name: user.name, role: user.role },
    });
  } catch (err) {
    console.error("Google signup error:", err);
    res.status(500).json({ error: "Server error" });
  }
};



/* ================================
    REQUEST PASSWORD RESET
================================ */
export const requestPasswordReset = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const user = await User.findOne({ email });

    // Always respond the same way, whether or not the user exists
    const genericMessage = "If an account with that email exists, a reset link has been sent.";

    if (!user) {
      return res.status(200).json({ message: genericMessage });
    }

    // Generate a raw token to email, and a hashed version to store
    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    await user.save();

    const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
    const resetLink = `${clientUrl}/reset-password?token=${rawToken}`;

    await sendResetEmail(user.email, resetLink);

    return res.status(200).json({ message: genericMessage });
  } catch (err) {
    console.error("Request password reset error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

/* ================================
    RESET PASSWORD
================================ */
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: "Token and new password are required" });
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ error: "Invalid or expired reset token" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    return res.status(200).json({ message: "Password has been reset successfully" });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ error: "Server error" });
  }
};
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.googleSignup = exports.login = exports.signup = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const user_1 = __importDefault(require("../models/user"));
const google_auth_library_1 = require("google-auth-library");
const JWT_SECRET = process.env.JWT_SECRET || "secretkey";
const client = new google_auth_library_1.OAuth2Client(process.env.GOOGLE_CLIENT_ID);
/* ================================
   🧾 USER SIGNUP (Manual)
================================ */
const signup = async (req, res) => {
    try {
        const { name, email, phone, password } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ error: "All required fields must be filled" });
        }
        const existing = await user_1.default.findOne({ email });
        if (existing)
            return res.status(400).json({ error: "Email already exists" });
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        const newUser = await user_1.default.create({
            name,
            email,
            phone,
            password: hashedPassword,
            role: "user",
        });
        const token = jsonwebtoken_1.default.sign({ id: newUser._id, name: newUser.name, role: newUser.role }, JWT_SECRET, { expiresIn: "7d" });
        return res.status(201).json({
            message: "Signup successful",
            token,
            user: { id: newUser._id, name: newUser.name, role: newUser.role },
        });
    }
    catch (err) {
        console.error("Signup error:", err);
        res.status(500).json({ error: "Server error" });
    }
};
exports.signup = signup;
/* ================================
   🔐 USER LOGIN
================================ */
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password)
            return res.status(400).json({ error: "Email and password are required" });
        const user = await user_1.default.findOne({ email });
        if (!user)
            return res.status(400).json({ error: "Invalid email or password" });
        if (!user.password) {
            return res.status(400).json({ error: "Please login using Google." });
        }
        const isMatch = await bcryptjs_1.default.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: "Invalid credentials" });
        }
        const token = jsonwebtoken_1.default.sign({ id: user._id, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
        return res.json({
            message: "Login successful",
            token,
            user: { id: user._id, name: user.name, role: user.role },
        });
    }
    catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ error: "Server error" });
    }
};
exports.login = login;
/* ================================
   🌐 GOOGLE SIGNUP / LOGIN
================================ */
const googleSignup = async (req, res) => {
    try {
        const { token } = req.body;
        if (!token)
            return res.status(400).json({ error: "No token provided" });
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        if (!payload || !payload.email)
            return res.status(400).json({ error: "Invalid Google token" });
        const { email, name } = payload;
        let user = await user_1.default.findOne({ email });
        if (!user) {
            user = await user_1.default.create({
                name: name || email.split("@")[0],
                email,
                googleId: payload.sub,
                role: "user",
            });
        }
        const jwtToken = jsonwebtoken_1.default.sign({ id: user._id, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
        return res.json({
            message: "Google signup/login successful",
            token: jwtToken,
            user: { id: user._id, name: user.name, role: user.role },
        });
    }
    catch (err) {
        console.error("Google signup error:", err);
        res.status(500).json({ error: "Server error" });
    }
};
exports.googleSignup = googleSignup;

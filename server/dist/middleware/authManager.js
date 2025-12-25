"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authManager = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const authManager = (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1]; // Bearer TOKEN
    if (!token) {
        return res.status(401).json({ message: "Unauthorized: No token provided" });
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || "secret");
        // Only allow manager role
        if (decoded.role !== "manager") {
            return res.status(403).json({ message: "Forbidden: Not a manager" });
        }
        req.user = decoded; // attach user info
        next();
    }
    catch (err) {
        return res.status(401).json({ message: "Unauthorized: Invalid token" });
    }
};
exports.authManager = authManager;

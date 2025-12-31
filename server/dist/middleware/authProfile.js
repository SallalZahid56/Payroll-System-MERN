"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authProfile = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const authProfile = (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1]; // Bearer TOKEN
    if (!token) {
        return res.status(401).json({ message: "Unauthorized: No token provided" });
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || "secret");
        // Only allow profile role
        if (decoded.role !== "profile") {
            return res.status(403).json({ message: "Forbidden: Not a profile user" });
        }
        req.user = decoded; // attach user info
        next();
    }
    catch (err) {
        return res.status(401).json({ message: "Unauthorized: Invalid token" });
    }
};
exports.authProfile = authProfile;

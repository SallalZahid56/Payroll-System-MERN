"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSheetsClient = getSheetsClient;
exports.getAuthClient = getAuthClient;
const googleapis_1 = require("googleapis");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// Function to create/get Google Sheets client
function getSheetsClient() {
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_BASE64) {
        throw new Error("GOOGLE_SERVICE_ACCOUNT_BASE64 is not set in your environment variables.");
    }
    const saPath = path_1.default.join(process.cwd(), "google-service.json");
    if (!fs_1.default.existsSync(saPath)) {
        const decoded = Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_BASE64, "base64").toString("utf8");
        fs_1.default.writeFileSync(saPath, decoded);
        console.log("✅ Google service JSON created at:", saPath);
    }
    const auth = new googleapis_1.google.auth.GoogleAuth({
        keyFile: saPath,
        scopes: [
            "https://www.googleapis.com/auth/spreadsheets",
            "https://www.googleapis.com/auth/drive",
        ],
    });
    const sheetsClient = googleapis_1.google.sheets({ version: "v4", auth });
    console.log("✅ Google Sheets client initialized successfully");
    return sheetsClient;
}
// Export auth client so other modules (e.g., controllers) can use Drive API
function getAuthClient() {
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_BASE64) {
        throw new Error("GOOGLE_SERVICE_ACCOUNT_BASE64 is not set in your environment variables.");
    }
    const saPath = path_1.default.join(process.cwd(), "google-service.json");
    if (!fs_1.default.existsSync(saPath)) {
        const decoded = Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_BASE64, "base64").toString("utf8");
        fs_1.default.writeFileSync(saPath, decoded);
    }
    return new googleapis_1.google.auth.GoogleAuth({
        keyFile: saPath,
        scopes: [
            "https://www.googleapis.com/auth/spreadsheets",
            "https://www.googleapis.com/auth/drive",
        ],
    });
}

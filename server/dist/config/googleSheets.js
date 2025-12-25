"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSheetsClient = getSheetsClient;
const googleapis_1 = require("googleapis");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// Function to create/get Google Sheets client
function getSheetsClient() {
    // Ensure environment variable is set
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_BASE64) {
        throw new Error("GOOGLE_SERVICE_ACCOUNT_BASE64 is not set in your environment variables.");
    }
    // Path to temporary service account JSON
    const saPath = path_1.default.join(process.cwd(), "google-service.json");
    // If JSON file doesn't exist, decode from base64 and create it
    if (!fs_1.default.existsSync(saPath)) {
        const decoded = Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_BASE64, "base64").toString("utf8");
        fs_1.default.writeFileSync(saPath, decoded);
        console.log("✅ Google service JSON created at:", saPath);
    }
    // Create Google Auth client
    const auth = new googleapis_1.google.auth.GoogleAuth({
        keyFile: saPath,
        scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
    // Return Google Sheets client
    const sheetsClient = googleapis_1.google.sheets({ version: "v4", auth });
    console.log("✅ Google Sheets client initialized successfully");
    return sheetsClient;
}

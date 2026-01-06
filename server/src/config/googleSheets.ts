import { google, sheets_v4 } from "googleapis";
import fs from "fs";
import path from "path";

// Function to create/get Google Sheets client
export function getSheetsClient(): sheets_v4.Sheets {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_BASE64) {
    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT_BASE64 is not set in your environment variables."
    );
  }

  const saPath = path.join(process.cwd(), "google-service.json");

  if (!fs.existsSync(saPath)) {
    const decoded = Buffer.from(
      process.env.GOOGLE_SERVICE_ACCOUNT_BASE64,
      "base64"
    ).toString("utf8");
    fs.writeFileSync(saPath, decoded);
    console.log("✅ Google service JSON created at:", saPath);
  }

  const auth = new google.auth.GoogleAuth({
    keyFile: saPath,
    scopes: [
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/drive",
    ],
  });

  const sheetsClient = google.sheets({ version: "v4", auth });
  console.log("✅ Google Sheets client initialized successfully");
  return sheetsClient;
}

// Export auth client so other modules (e.g., controllers) can use Drive API
export function getAuthClient(): any {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_BASE64) {
    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT_BASE64 is not set in your environment variables."
    );
  }

  const saPath = path.join(process.cwd(), "google-service.json");
  if (!fs.existsSync(saPath)) {
    const decoded = Buffer.from(
      process.env.GOOGLE_SERVICE_ACCOUNT_BASE64,
      "base64"
    ).toString("utf8");
    fs.writeFileSync(saPath, decoded);
  }

  return new google.auth.GoogleAuth({
    keyFile: saPath,
    scopes: [
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/drive",
    ],
  });
}

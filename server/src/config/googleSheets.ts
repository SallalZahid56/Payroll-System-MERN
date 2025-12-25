import { google, sheets_v4 } from "googleapis";
import fs from "fs";
import path from "path";

// Function to create/get Google Sheets client
export function getSheetsClient(): sheets_v4.Sheets {
  // Ensure environment variable is set
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_BASE64) {
    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT_BASE64 is not set in your environment variables."
    );
  }

  // Path to temporary service account JSON
  const saPath = path.join(process.cwd(), "google-service.json");

  // If JSON file doesn't exist, decode from base64 and create it
  if (!fs.existsSync(saPath)) {
    const decoded = Buffer.from(
      process.env.GOOGLE_SERVICE_ACCOUNT_BASE64,
      "base64"
    ).toString("utf8");
    fs.writeFileSync(saPath, decoded);
    console.log("✅ Google service JSON created at:", saPath);
  }

  // Create Google Auth client
  const auth = new google.auth.GoogleAuth({
    keyFile: saPath,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  // Return Google Sheets client
  const sheetsClient = google.sheets({ version: "v4", auth });

  console.log("✅ Google Sheets client initialized successfully");

  return sheetsClient;
}

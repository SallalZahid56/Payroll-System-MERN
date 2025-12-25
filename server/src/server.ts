import dotenv from "dotenv";  // MUST be first
dotenv.config();

import express, { Request, Response } from "express";
import mongoose from "mongoose";
import cors from "cors";
import authRoutes from "./routes/authRoutes";
import adminRoutes from "./routes/adminRoutes";
import { startSyncScheduler } from "./utils/syncScheduler"; // We'll create this
import managerRoutes from "./routes/managerRoutes";

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI as string;

// ✅ CORS configuration
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

// MongoDB connection
mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected successfully");

    // Start automatic project data sync scheduler after DB connection
    startSyncScheduler();
  })
  .catch((err) => console.error("❌ MongoDB connection failed:", err));

// Default route
app.get("/", (req: Request, res: Response) => {
  res.send("🚀 Server is running successfully!");
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/manager", managerRoutes);

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));

/// <reference path="./types/express.d.ts" />
import dotenv from "dotenv";  // MUST be first
dotenv.config();
import express, { Request, Response } from "express";
import mongoose from "mongoose";
import cors from "cors";
import authRoutes from "./routes/authRoutes";
import adminRoutes from "./routes/adminRoutes";
import { startSyncScheduler } from "./utils/syncScheduler";
import managerRoutes from "./routes/managerRoutes";
import profileRoutes from "./routes/profileRoutes";
import userRoutes from "./routes/userRoutes";
import { startInactiveResetScheduler } from "./utils/startInactiveResetScheduler";

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI as string;

const allowedOrigins = [
  process.env.CLIENT_URL,
  process.env.CLIENT_URL_PROD,
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow Postman / server-to-server requests
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS blocked for origin: ${origin}`));
      }
    },
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
    startInactiveResetScheduler();
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
app.use("/api/profile", profileRoutes);
app.use("/api/user", userRoutes);

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
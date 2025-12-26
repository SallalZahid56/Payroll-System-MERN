"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv")); // MUST be first
dotenv_1.default.config();
const express_1 = __importDefault(require("express"));
const mongoose_1 = __importDefault(require("mongoose"));
const cors_1 = __importDefault(require("cors"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const adminRoutes_1 = __importDefault(require("./routes/adminRoutes"));
const syncScheduler_1 = require("./utils/syncScheduler"); // We'll create this
const managerRoutes_1 = __importDefault(require("./routes/managerRoutes"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;
const allowedOrigins = [
    process.env.CLIENT_URL,
    process.env.CLIENT_URL_PROD,
];
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Allow Postman / server-to-server requests
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            callback(new Error(`CORS blocked for origin: ${origin}`));
        }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(express_1.default.json());
// MongoDB connection
mongoose_1.default
    .connect(MONGO_URI)
    .then(() => {
    console.log("✅ MongoDB connected successfully");
    // Start automatic project data sync scheduler after DB connection
    (0, syncScheduler_1.startSyncScheduler)();
})
    .catch((err) => console.error("❌ MongoDB connection failed:", err));
// Default route
app.get("/", (req, res) => {
    res.send("🚀 Server is running successfully!");
});
// Routes
app.use("/api/auth", authRoutes_1.default);
app.use("/api/admin", adminRoutes_1.default);
app.use("/api/manager", managerRoutes_1.default);
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const dotenv_1 = __importDefault(require("dotenv"));
const user_1 = __importDefault(require("../models/user"));
dotenv_1.default.config();
const seedAdmin = async () => {
    try {
        if (!process.env.MONGO_URI) {
            console.error("❌ MONGO_URI is not defined in .env");
            process.exit(1);
        }
        await mongoose_1.default.connect(process.env.MONGO_URI);
        const email = "admin@payroll.com"; // <-- Change this for each new admin
        // Check if this email already exists
        const existingAdmin = await user_1.default.findOne({ email });
        if (existingAdmin) {
            console.log(`⚠️ Admin with email ${email} already exists.`);
            process.exit(0);
        }
        const hashedPassword = await bcryptjs_1.default.hash("Admin@3026", 10);
        await user_1.default.create({
            name: "New Admin",
            email,
            phone: "0000000000",
            password: hashedPassword,
            role: "admin",
        });
        console.log(`✅ Admin ${email} seeded successfully`);
        process.exit(0);
    }
    catch (err) {
        console.error("❌ Error seeding admin:", err);
        process.exit(1);
    }
};
seedAdmin();

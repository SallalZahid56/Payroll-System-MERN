import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import User from "../models/user";

dotenv.config();

const seedAdmin = async () => {
  try {
    if (!process.env.MONGO_URI) {
      console.error("❌ MONGO_URI is not defined in .env");
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGO_URI);

    const email = "admin@payroll.com"; // <-- Change this for each new admin

    // Check if this email already exists
    const existingAdmin = await User.findOne({ email });
    if (existingAdmin) {
      console.log(`⚠️ Admin with email ${email} already exists.`);
      process.exit(0);
    }

    const hashedPassword = await bcrypt.hash("Admin@3026", 10);
    await User.create({
      name: "New Admin",
      email,
      phone: "0000000000",
      password: hashedPassword,
      role: "admin",
    });

    console.log(`✅ Admin ${email} seeded successfully`);
    process.exit(0);
  } catch (err) {
    console.error("❌ Error seeding admin:", err);
    process.exit(1);
  }
};

seedAdmin();

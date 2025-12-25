import bcrypt from "bcryptjs";
import User from "./src/models/user";
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config(); // Load .env

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI as string);
    console.log("Connected to MongoDB");

    const users = await User.find({});

    for (const user of users) {
      if (user.password && !user.password.startsWith("$2a$")) {
        const hashed = await bcrypt.hash(user.password, 10);
        user.password = hashed;
        await user.save();
        console.log(`✔ Password fixed for: ${user.email}`);
      }
    }

    console.log("🎉 DONE — All plain passwords hashed.");
    process.exit();
  } catch (error) {
    console.error("Migration error:", error);
    process.exit(1);
  }
})();
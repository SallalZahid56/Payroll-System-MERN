import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  phone?: string;
  password?: string; // make optional because Google users don’t have one
  googleId?: string; // add this line
  role?: "user" | "manager" | "admin" | "profile" | "cordinator";
  created_at?: Date;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String },
    // Added return type boolean and used function keyword to access `this`
    password: {
      type: String,
      required: function (this: IUser): boolean {
        return !this.googleId;
      },
    },
    googleId: { type: String },
    role: {
      type: String,
      enum: ["user", "manager", "admin", "profile", "cordinator"],
      default: "user",
    },
    created_at: { type: Date, default: Date.now },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
  },
  { timestamps: false }
);

export default mongoose.model<IUser>("User", UserSchema);
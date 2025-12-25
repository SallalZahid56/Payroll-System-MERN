import mongoose, { Schema, Document } from "mongoose";

export interface IProject extends Document {
    project_id: string;
    project_name: string;
    profile_name: string;
    sheet_name: string;
    project_type?: string;
    fixed_option?: string;
    work_type?: string;
    lumpsum_price?: number;
    price_worker_one?: number;
    price_worker_two?: number;
    price_per_hour?: number;
    total_entries?: number;
    shift?: string;
    instructions?: string;
    project_columns?: string;
    created_at?: Date;
    updated_at?: Date;
    assigned_to?: string;
    assigned_to_ids?: string;
    status?: "pending" | "submitted" | "completed";
    assigned_to_coordinators?: string;
    is_file_based?: boolean;
    google_sheet_url?: string;
    sheet_status?: string;
    last_opened?: Date;
    company?: string;
    is_revised?: boolean;
    original_completed_at?: Date;
    profile_price_per_entry?: number;
    price_worker_three?: number;
    price_worker_four?: number;
    price_worker_five?: number;
    deadline?: Date;
}

const ProjectSchema: Schema<IProject> = new Schema(
    {
        project_id: { type: String, required: true, unique: true },
        project_name: { type: String, required: true, unique: true },
        profile_name: { type: String, required: true },
        sheet_name: { type: String, required: true },
        project_type: { type: String, default: "fixed" },
        fixed_option: { type: String, default: "" },
        work_type: { type: String, default: "" },
        lumpsum_price: { type: Number, default: 0 },
        price_worker_one: { type: Number, default: 0 },
        price_worker_two: { type: Number, default: 0 },
        price_worker_three: { type: Number, default: 0 },
        price_worker_four: { type: Number, default: 0 },
        price_worker_five: { type: Number, default: 0 },
        price_per_hour: { type: Number, default: 0 },
        total_entries: { type: Number, default: 0 },
        shift: { type: String, default: "" },
        instructions: { type: String, default: "" },
        project_columns: { type: String, default: "" },
        assigned_to: { type: String, default: "" },
        assigned_to_ids: { type: String, default: "" },
        status: { type: String, enum: ["pending", "submitted", "completed"], default: "pending" },
        assigned_to_coordinators: { type: String, default: "" },
        is_file_based: { type: Boolean, default: false },
        google_sheet_url: { type: String, default: "" },
        sheet_status: { type: String, default: "Not Started" },
        last_opened: { type: Date, default: null },
        company: { type: String, default: "" },
        is_revised: { type: Boolean, default: false },
        original_completed_at: { type: Date, default: null },
        profile_price_per_entry: { type: Number, default: 0 },
        deadline: { type: Date, default: null },
        created_at: { type: Date, default: Date.now },
        updated_at: { type: Date, default: Date.now },
    },
    { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

export default mongoose.model<IProject>("Project", ProjectSchema);

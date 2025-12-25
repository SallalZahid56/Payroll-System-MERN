"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const ProjectSchema = new mongoose_1.Schema({
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
}, { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } });
exports.default = mongoose_1.default.model("Project", ProjectSchema);

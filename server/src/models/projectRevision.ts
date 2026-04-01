import mongoose, { Schema, Document } from 'mongoose';

export interface IWorkerDiff {
  worker_name: string;
  old_salary: number;
  new_salary: number;
  diff: number;
  old_entries?: number;
  new_entries?: number;
  applied?: boolean;
}

export interface IProjectRevision extends Document {
  project_id: string;
  created_by?: string;
  created_at?: Date;
  summary?: string;
  worker_diffs?: IWorkerDiff[];
  notes?: string;
}

const WorkerDiffSchema = new Schema<IWorkerDiff>({
  worker_name: { type: String, required: true },
  old_salary: { type: Number, required: true },
  new_salary: { type: Number, required: true },
  diff: { type: Number, required: true },
  old_entries: { type: Number, default: null },
  new_entries: { type: Number, default: null },
  applied: { type: Boolean, default: false },
});

const ProjectRevisionSchema = new Schema<IProjectRevision>({
  project_id: { type: String, required: true, index: true },
  created_by: { type: String, default: null },
  created_at: { type: Date, default: Date.now },
  summary: { type: String, default: '' },
  worker_diffs: { type: [WorkerDiffSchema], default: [] },
  notes: { type: String, default: '' },
});

export default mongoose.model<IProjectRevision>('ProjectRevision', ProjectRevisionSchema);

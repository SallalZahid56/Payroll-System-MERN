import mongoose, { Schema, Document } from 'mongoose';

export interface IPayrollAdjustment extends Document {
  project_id: string;
  worker_name: string;
  amount: number;
  reason?: string;
  created_by?: string;
  created_at?: Date;
  applied?: boolean;
  applied_to_run_id?: string | null;
  source?: string;
}

const PayrollAdjustmentSchema = new Schema<IPayrollAdjustment>({
  project_id: { type: String, required: true, index: true },
  worker_name: { type: String, required: true },
  amount: { type: Number, required: true },
  reason: { type: String, default: '' },
  created_by: { type: String, default: null },
  created_at: { type: Date, default: Date.now },
  applied: { type: Boolean, default: false, index: true },
  applied_to_run_id: { type: String, default: null },
  source: { type: String, default: 'revision' },
});

export default mongoose.model<IPayrollAdjustment>('PayrollAdjustment', PayrollAdjustmentSchema);

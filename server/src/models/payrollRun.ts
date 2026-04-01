import mongoose, { Schema, Document } from 'mongoose';

export interface IPayrollRun extends Document {
  start_date: Date;
  end_date: Date;
  created_by?: string;
  created_at?: Date;
  processed_at?: Date | null;
  paid?: boolean;
  projects_included?: string[];
  adjustments_included?: string[];
  totals?: Record<string, any>;
}

const PayrollRunSchema = new Schema<IPayrollRun>({
  start_date: { type: Date, required: true },
  end_date: { type: Date, required: true },
  created_by: { type: String, default: null },
  created_at: { type: Date, default: Date.now },
  processed_at: { type: Date, default: null },
  paid: { type: Boolean, default: false },
  projects_included: { type: [String], default: [] },
  adjustments_included: { type: [String], default: [] },
  totals: { type: Schema.Types.Mixed, default: {} },
});

export default mongoose.model<IPayrollRun>('PayrollRun', PayrollRunSchema);

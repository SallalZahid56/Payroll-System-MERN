import mongoose, { Schema, Document } from "mongoose";

export interface IColumn extends Document {
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

const ColumnSchema: Schema<IColumn> = new Schema(
  {
    name: { type: String, required: true, unique: true },
  },
  { timestamps: true } // This automatically adds createdAt and updatedAt
);

const Column = mongoose.model<IColumn>("Column", ColumnSchema);

export default Column;

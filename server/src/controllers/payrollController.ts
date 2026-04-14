import { Request, Response } from 'express';
import mongoose from 'mongoose';
import PayrollAdjustment from '../models/payrollAdjustment';
import PayrollRun from '../models/payrollRun';
import ProjectRevision from '../models/projectRevision';
import Project from '../models/Project';
import User from '../models/user';

const db = mongoose.connection;

// Dynamic ProjectData model (same collection used elsewhere)
// Reuse existing ProjectData model if already compiled, avoid OverwriteModelError
const ProjectData = (mongoose.models && (mongoose.models as any).ProjectData) ||
    mongoose.model(
        "ProjectData",
        new mongoose.Schema({}, { strict: false, collection: "project_data" })
    );

// Normalize names to compare with user list (copied from adminController)
const normalizeName = (name?: string): string => {
    return (
        name
            ?.normalize("NFKD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, "")
            .replace(/[^a-z0-9]/gi, "")
            .toLowerCase() || ""
    );
};

// Create a payroll adjustment (manual or from revision)
export const createAdjustment = async (req: Request, res: Response) => {
    try {
        const { project_id, worker_name, amount, reason, created_by, source } = req.body;
        if (!project_id || !worker_name || typeof amount !== 'number') {
            return res.status(400).json({ success: false, message: 'project_id, worker_name and numeric amount are required' });
        }

        const adj = await PayrollAdjustment.create({
            project_id,
            worker_name,
            amount,
            reason: reason || '',
            created_by: created_by || null,
            source: source || 'manual',
        });

        res.json({ success: true, adjustment: adj });
    } catch (err) {
        console.error('Error creating adjustment:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// List adjustments with optional filters
export const listAdjustments = async (req: Request, res: Response) => {
    try {
        const { projectId, applied } = req.query;
        const q: any = {};
        if (projectId) q.project_id = String(projectId);
        if (applied !== undefined) q.applied = applied === 'true';

        const docs = await PayrollAdjustment.find(q).sort({ created_at: -1 }).lean();
        res.json({ success: true, data: docs });
    } catch (err) {
        console.error('Error listing adjustments:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Mark adjustment applied and optionally attach to payroll run
export const markAdjustmentApplied = async (req: Request, res: Response) => {
    try {
        const id = req.params.id;
        const { payrollRunId } = req.body;
        const upd: any = { applied: true };
        if (payrollRunId) upd.applied_to_run_id = payrollRunId;

        const updated = await PayrollAdjustment.findByIdAndUpdate(id, upd, { new: true });
        if (!updated) return res.status(404).json({ success: false, message: 'Adjustment not found' });
        res.json({ success: true, adjustment: updated });
    } catch (err) {
        console.error('Error applying adjustment:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Create a payroll run (does not process payments yet)
export const createPayrollRun = async (req: Request, res: Response) => {
    try {
        const { start_date, end_date, created_by, projects_included } = req.body;
        if (!start_date || !end_date) return res.status(400).json({ success: false, message: 'start_date and end_date required' });

        const run = await PayrollRun.create({
            start_date: new Date(start_date),
            end_date: new Date(end_date),
            created_by: created_by || null,
            projects_included: Array.isArray(projects_included) ? projects_included : [],
        });

        res.json({ success: true, payrollRun: run });
    } catch (err) {
        console.error('Error creating payroll run:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

export const listPayrollRuns = async (_req: Request, res: Response) => {
    try {
        const runs = await PayrollRun.find({}).sort({ created_at: -1 }).lean();
        res.json({ success: true, data: runs });
    } catch (err) {
        console.error('Error listing payroll runs:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Preview revision (stub) — returns a placeholder until revision computation implemented
export const previewRevision = async (req: Request, res: Response) => {
    try {
        const { projectId } = req.body;
        if (!projectId) return res.status(400).json({ success: false, message: 'projectId required' });

        // Fetch project and project data
        const project = await Project.findOne({ project_id: projectId }).lean();
        const projectData = await ProjectData.findOne({ project_id: projectId }).lean() as any;
        if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

        // Build user map
        const users = await User.find({}, { name: 1 }).lean();
        const userMap: Record<string, string> = {};
        users.forEach((u: any) => (userMap[normalizeName(u.name)] = u.name));

        // Compute projected salaries using similar logic as approval flows
        const entryCountMap: Record<string, number> = {
            'Double Entry': 2,
            'Triple Entry': 3,
            'Fourth Entry': 4,
            'Fifth Entry': 5,
        };

        const fixedOpt = project.fixed_option || '';
        const numEntries = fixedOpt === 'Single Entry' ? 1 : (entryCountMap[fixedOpt as keyof typeof entryCountMap] ?? 0);

        const priceMap = [
            project.price_worker_one ?? 0,
            project.price_worker_two ?? 0,
            project.price_worker_three ?? 0,
            project.price_worker_four ?? 0,
            project.price_worker_five ?? 0,
        ];

        const projectedSalaries: Record<string, { salary: number; entries: number }> = {};

        if (Array.isArray(projectData?.row_data) && projectData.row_data.length > 0) {
            const rows = projectData.row_data as any[][];
            const header = Array.isArray(rows[0]) ? rows[0].map((h: any) => String(h || '')) : [];
            const headerNorm = header.map((h: string) => h.trim().toLowerCase());

            const workerColumnNames = ['Worker One', 'Worker Two', 'Worker Three', 'Worker Four', 'Worker Five'].slice(0, numEntries || 1);
            const workerIndices = workerColumnNames.map((w) => headerNorm.indexOf(w.trim().toLowerCase()));
            const foundHeaderCols = workerIndices.some((idx) => idx >= 0);

            if (foundHeaderCols) {
                for (let r = 1; r < rows.length; r++) {
                    const row = rows[r] || [];
                    for (let i = 0; i < workerIndices.length; i++) {
                        const colIndex = workerIndices[i];
                        if (colIndex < 0 || colIndex >= row.length) continue;
                        const rawCell = row[colIndex];
                        if (!rawCell) continue;
                        const names = String(rawCell).split(',').map(s => s.trim()).filter(Boolean);
                        for (const name of names) {
                            const normalized = normalizeName(name);
                            if (!normalized) continue;
                            const realUser = userMap[normalized];
                            if (!realUser) continue;
                            const price = priceMap[i] ?? 0;
                            projectedSalaries[realUser] = projectedSalaries[realUser] || { salary: 0, entries: 0 };
                            projectedSalaries[realUser].salary += Number(price || 0);
                            projectedSalaries[realUser].entries += 1;
                        }
                    }
                }
            } else {
                // fallback: last N columns
                rows.forEach((row) => {
                    if (!Array.isArray(row)) return;
                    const startIndex = Math.max(0, row.length - (numEntries || 1));
                    for (let i = 0; i < (numEntries || 1); i++) {
                        const colIndex = startIndex + i;
                        if (colIndex >= row.length) continue;
                        const rawName = row[colIndex];
                        if (!rawName) continue;
                        const normalized = normalizeName(String(rawName));
                        if (!normalized) continue;
                        const realUser = userMap[normalized];
                        if (!realUser) continue;
                        const price = priceMap[i] ?? 0;
                        projectedSalaries[realUser] = projectedSalaries[realUser] || { salary: 0, entries: 0 };
                        projectedSalaries[realUser].salary += Number(price || 0);
                        projectedSalaries[realUser].entries += 1;
                    }
                });
            }
        }

        // Read existing worker salaries from workersalaries collection
        const WorkerSalaryCollection = db.collection('workersalaries');
        const preview: any[] = [];

        // Try to use a saved snapshot revision (created when project was marked pending for revision)
        const snapshot = await ProjectRevision.findOne({ project_id: projectId, summary: /snapshot/i }).sort({ created_at: -1 }).lean();
        const snapshotMap: Record<string, { oldSalary: number; oldEntries: number }> = {};
        if (snapshot && Array.isArray(snapshot.worker_diffs)) {
            for (const wd of snapshot.worker_diffs as any[]) {
                if (wd && wd.worker_name) {
                    snapshotMap[wd.worker_name] = { oldSalary: Number(wd.old_salary || 0), oldEntries: Number(wd.old_entries || 0) };
                }
            }
        }

        for (const workerName of Object.keys(projectedSalaries)) {
            let oldSalary = 0;
            let oldEntries = 0;
            if (snapshotMap[workerName]) {
                oldSalary = snapshotMap[workerName].oldSalary;
                oldEntries = snapshotMap[workerName].oldEntries;
            } else {
                const existing = await WorkerSalaryCollection.findOne({ worker_name: workerName, project_id: projectId }) as any;
                oldSalary = Number(existing?.salary || 0);
                oldEntries = Number(existing?.no_of_entries || 0);
            }
            const newSalary = Number(projectedSalaries[workerName].salary || 0);
            const newEntries = Number(projectedSalaries[workerName].entries || 0);
            preview.push({ worker: workerName, oldSalary, newSalary, diff: newSalary - oldSalary, oldEntries, newEntries });
        }

        // Detect if project has already been included in a paid payroll run
        const paidRun = await PayrollRun.findOne({ projects_included: projectId, paid: true }).lean();

        res.json({ success: true, project: { project_id: projectId, fixed_option: project.fixed_option }, paid: Boolean(paidRun), preview });
    } catch (err) {
        console.error('Error previewing revision:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Apply revision: compute diffs and either create adjustments (if already paid) or update workersalaries (if unpaid)
export const applyRevision = async (req: Request, res: Response) => {
    try {
        const { projectId, selectedWorkers, reason, applyMode, created_by } = req.body;
        const result = await applyRevisionInternal({ projectId, selectedWorkers, reason, applyMode, created_by });
        res.json(result);
    } catch (err) {
        console.error('Error applying revision:', err);
        res.status(500).json({ success: false, message: 'Error applying revision' });
    }
};

// Programmatic helper: apply revision logic usable from other controllers
export async function applyRevisionInternal(opts: { projectId: string; selectedWorkers?: string[]; reason?: string; applyMode?: string; created_by?: string | null; }) {
    const { projectId, selectedWorkers, reason, applyMode, created_by } = opts;
    if (!projectId) return { success: false, message: 'projectId required' };

    const previewResp = await previewComputation(projectId);
    if (!previewResp) return { success: false, message: 'Failed to compute preview' };

    const { preview, paid } = previewResp as any;

    const toApply = Array.isArray(selectedWorkers) && selectedWorkers.length > 0
        ? preview.filter((p: any) => selectedWorkers.includes(p.worker))
        : preview;

    const revisionsRecorded: any[] = [];

    const WorkerSalaryCollection = db.collection('workersalaries');

    for (const item of toApply) {
        const diff = Number(item.newSalary) - Number(item.oldSalary);
        if (diff === 0) continue;

        if (paid || applyMode === 'pending' || applyMode === 'adjust') {
            const adj = await PayrollAdjustment.create({ project_id: projectId, worker_name: item.worker, amount: diff, reason: reason || '', created_by: created_by || null, source: 'revision' });
            revisionsRecorded.push(adj);
        } else {
            await WorkerSalaryCollection.updateOne({ worker_name: item.worker, project_id: projectId }, { $set: { salary: item.newSalary, no_of_entries: item.newEntries, profile_debit: item.newSalary } }, { upsert: true });
            revisionsRecorded.push({ worker: item.worker, applied_directly: true });
        }
    }

    const rev = await ProjectRevision.create({ project_id: projectId, created_by: created_by || null, summary: `Applied revision (${revisionsRecorded.length} workers)`, worker_diffs: toApply.map((t: any) => ({ worker_name: t.worker, old_salary: t.oldSalary, new_salary: t.newSalary, diff: t.newSalary - t.oldSalary, old_entries: t.oldEntries, new_entries: t.newEntries })) });

    return { success: true, revisionsRecorded, revision: rev };
}

// Internal helper: compute preview (returns preview array and paid flag)
async function previewComputation(projectId: string) {
    try {
        const project = await Project.findOne({ project_id: projectId }).lean();
        const projectData = await ProjectData.findOne({ project_id: projectId }).lean() as any;
        if (!project) return null;
        const users = await User.find({}, { name: 1 }).lean();
        const userMap: Record<string, string> = {};
        users.forEach((u: any) => (userMap[normalizeName(u.name)] = u.name));

        const entryCountMap: Record<string, number> = { 'Double Entry': 2, 'Triple Entry': 3, 'Fourth Entry': 4, 'Fifth Entry': 5 };
        const fixedOpt = project.fixed_option || '';
        const numEntries = fixedOpt === 'Single Entry' ? 1 : (entryCountMap[fixedOpt as keyof typeof entryCountMap] ?? 0);
        const priceMap = [project.price_worker_one ?? 0, project.price_worker_two ?? 0, project.price_worker_three ?? 0, project.price_worker_four ?? 0, project.price_worker_five ?? 0];
        const projectedSalaries: Record<string, { salary: number; entries: number }> = {};

        if (Array.isArray(projectData?.row_data) && projectData.row_data.length > 0) {
            const rows = projectData.row_data as any[][];
            const header = Array.isArray(rows[0]) ? rows[0].map((h: any) => String(h || '')) : [];
            const headerNorm = header.map((h: string) => h.trim().toLowerCase());
            const workerColumnNames = ['Worker One', 'Worker Two', 'Worker Three', 'Worker Four', 'Worker Five'].slice(0, numEntries || 1);
            const workerIndices = workerColumnNames.map((w) => headerNorm.indexOf(w.trim().toLowerCase()));
            const foundHeaderCols = workerIndices.some((idx) => idx >= 0);

            if (foundHeaderCols) {
                for (let r = 1; r < rows.length; r++) {
                    const row = rows[r] || [];
                    for (let i = 0; i < workerIndices.length; i++) {
                        const colIndex = workerIndices[i];
                        if (colIndex < 0 || colIndex >= row.length) continue;
                        const rawCell = row[colIndex];
                        if (!rawCell) continue;
                        const names = String(rawCell).split(',').map(s => s.trim()).filter(Boolean);
                        for (const name of names) {
                            const normalized = normalizeName(name);
                            if (!normalized) continue;
                            const realUser = userMap[normalized];
                            if (!realUser) continue;
                            const price = priceMap[i] ?? 0;
                            projectedSalaries[realUser] = projectedSalaries[realUser] || { salary: 0, entries: 0 };
                            projectedSalaries[realUser].salary += Number(price || 0);
                            projectedSalaries[realUser].entries += 1;
                        }
                    }
                }
            } else {
                rows.forEach((row) => {
                    if (!Array.isArray(row)) return;
                    const startIndex = Math.max(0, row.length - (numEntries || 1));
                    for (let i = 0; i < (numEntries || 1); i++) {
                        const colIndex = startIndex + i;
                        if (colIndex >= row.length) continue;
                        const rawName = row[colIndex];
                        if (!rawName) continue;
                        const normalized = normalizeName(String(rawName));
                        if (!normalized) continue;
                        const realUser = userMap[normalized];
                        if (!realUser) continue;
                        const price = priceMap[i] ?? 0;
                        projectedSalaries[realUser] = projectedSalaries[realUser] || { salary: 0, entries: 0 };
                        projectedSalaries[realUser].salary += Number(price || 0);
                        projectedSalaries[realUser].entries += 1;
                    }
                });
            }
        }

        const WorkerSalaryCollection = db.collection('workersalaries');
        const preview: any[] = [];
        for (const workerName of Object.keys(projectedSalaries)) {
            const existing = await WorkerSalaryCollection.findOne({ worker_name: workerName, project_id: projectId }) as any;
            const oldSalary = Number(existing?.salary || 0);
            const oldEntries = Number(existing?.no_of_entries || 0);
            const newSalary = Number(projectedSalaries[workerName].salary || 0);
            const newEntries = Number(projectedSalaries[workerName].entries || 0);
            preview.push({ worker: workerName, oldSalary, newSalary, diff: newSalary - oldSalary, oldEntries, newEntries });
        }

        const paidRun = await PayrollRun.findOne({ projects_included: projectId, paid: true }).lean();
        return { preview, paid: Boolean(paidRun) };
    } catch (err) {
        console.error('previewComputation error', err);
        return null;
    }
}

// Create a stored project revision record (audit)
export const createProjectRevisionRecord = async (req: Request, res: Response) => {
    try {
        const { project_id, created_by, summary, worker_diffs, notes } = req.body;
        const rec = await ProjectRevision.create({ project_id, created_by: created_by || null, summary: summary || '', worker_diffs: worker_diffs || [], notes: notes || '' });
        res.json({ success: true, revision: rec });
    } catch (err) {
        console.error('Error creating project revision record:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

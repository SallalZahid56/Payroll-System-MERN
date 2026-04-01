import { useEffect, useState } from "react";
import axios from "../utils/axios";

interface WorkerDiff {
  worker: string;
  oldSalary: number;
  newSalary: number;
  diff: number;
  oldEntries?: number;
  newEntries?: number;
}

interface Props {
  projectId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onApplied?: () => void;
}

export default function RevisionPreviewModal({ projectId, isOpen, onClose, onApplied }: Props) {
  const [loading, setLoading] = useState(false);
  const [workers, setWorkers] = useState<WorkerDiff[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [reason, setReason] = useState("");

  const extractErrorMessage = (e: unknown, fallback = 'An error occurred') => {
    if (!e) return fallback;
    if (typeof e === 'string') return e;
    if (e instanceof Error) return e.message;
    const maybe = e as { response?: { data?: { message?: string } } } | undefined;
    return maybe?.response?.data?.message || fallback;
  };

  useEffect(() => {
    if (!isOpen || !projectId) return;
    setLoading(true);
    (async () => {
      try {
        const res = await axios.post("/admin/revisions/preview", { projectId });
        const data = res.data;
        const list: WorkerDiff[] = Array.isArray(data.workers) ? data.workers : [];
        setWorkers(list);
        const sel: Record<string, boolean> = {};
        list.forEach((w) => (sel[w.worker] = true));
        setSelected(sel);
      } catch (err) {
        console.error("Failed to preview revision:", err);
        alert(extractErrorMessage(err, 'Preview failed'));
      } finally {
        setLoading(false);
      }
    })();
  }, [isOpen, projectId]);

  const toggle = (name: string) => setSelected(s => ({ ...s, [name]: !s[name] }));

  const apply = async (mode: "pending" | "auto") => {
    if (!projectId) return;
    const applyWorkers = Object.keys(selected).filter(k => selected[k]);
    if (applyWorkers.length === 0) return alert("Select at least one worker");

    try {
      setLoading(true);
      const payload: {
        projectId: string;
        applyMode: "pending" | "auto";
        applyWorkers: string[];
        reason: string;
        performedBy: string;
      } = {
        projectId,
        applyMode: mode,
        applyWorkers,
        reason,
        performedBy: "admin",
      };

      const res = await axios.post("/admin/revisions", payload);
      alert(res.data?.message || "Revision applied/recorded");
      if (onApplied) onApplied();
      onClose();
    } catch (err) {
      console.error("Failed to apply revision:", err);
      alert(extractErrorMessage(err, 'Apply failed'));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl p-6 relative">
        <button onClick={onClose} className="absolute top-3 right-4 text-gray-600">&times;</button>
        <h3 className="text-xl font-bold mb-4">Revision preview — {projectId}</h3>

        {loading ? (
          <div>Loading preview...</div>
        ) : (
          <div>
            <div className="max-h-72 overflow-y-auto border rounded mb-4">
              <table className="w-full text-left">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-2">Apply</th>
                    <th className="p-2">Worker</th>
                    <th className="p-2">Old Salary</th>
                    <th className="p-2">New Salary</th>
                    <th className="p-2">Diff</th>
                    <th className="p-2">Old Entries</th>
                    <th className="p-2">New Entries</th>
                  </tr>
                </thead>
                <tbody>
                  {workers.map(w => (
                    <tr key={w.worker} className="border-t">
                      <td className="p-2 text-center">
                        <input type="checkbox" checked={!!selected[w.worker]} onChange={() => toggle(w.worker)} />
                      </td>
                      <td className="p-2">{w.worker}</td>
                      <td className="p-2">{w.oldSalary ?? 0}</td>
                      <td className="p-2">{w.newSalary ?? 0}</td>
                      <td className="p-2">{(w.diff ?? 0).toFixed(2)}</td>
                      <td className="p-2">{w.oldEntries ?? "-"}</td>
                      <td className="p-2">{w.newEntries ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mb-4">
              <label className="block text-sm text-gray-700 mb-1">Reason</label>
              <input value={reason} onChange={e => setReason(e.target.value)} className="w-full border rounded px-3 py-2" />
            </div>

            <div className="flex gap-2 justify-end">
              <button className="px-4 py-2 bg-gray-200 rounded" onClick={onClose}>Cancel</button>
              <button className="px-4 py-2 bg-amber-600 text-white rounded" onClick={() => apply("pending")}>Save As Pending</button>
              <button className="px-4 py-2 bg-green-600 text-white rounded" onClick={() => apply("auto")}>Apply Now</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

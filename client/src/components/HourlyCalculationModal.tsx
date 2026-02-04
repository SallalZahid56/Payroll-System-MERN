import { useEffect, useMemo, useState } from "react";
import axios from "../utils/axios";

interface SalaryRow {
  worker: string;
  runnedHours: number;
  pricePerHour: number;
}

interface Props {
  open: boolean;
  projectId: string | null;
  assignedTo: string | null; // comma separated
  pricePerHour: number | null;
  onClose: () => void;
  onSaved?: () => void;
}

export default function HourlyCalculationModal({
  open,
  projectId,
  assignedTo,
  pricePerHour,
  onClose,
  onSaved,
}: Props) {
  const [rows, setRows] = useState<SalaryRow[]>([]);
  const [companyPrice, setCompanyPrice] = useState<number>(0);

  useEffect(() => {
    if (!open) return;

    const workers = (assignedTo || "").split(",").map((w) => w.trim()).filter(Boolean);
    const initialRows: SalaryRow[] = workers.map((w) => ({
      worker: w,
      runnedHours: 0,
      pricePerHour: pricePerHour || 0,
    }));

    // Add company row
    initialRows.push({ worker: "Company", runnedHours: 0, pricePerHour: 0 });

    setRows(initialRows);
    setCompanyPrice(0);
  }, [open, assignedTo, pricePerHour]);

  const totalRunnedHours = useMemo(
    () => rows.reduce((s, r) => s + Number(r.runnedHours || 0), 0),
    [rows]
  );

  const updateRow = (index: number, changes: Partial<SalaryRow>) => {
    setRows((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...changes };
      return copy;
    });
  };

  const handleSave = async () => {
    if (!projectId) return;

    const salaries = rows.map((r) => {
      const runnedHours = Number(r.runnedHours || 0);
      let salary = 0;
      if (r.worker === "Company") {
        salary = runnedHours * Number(companyPrice || 0);
      } else {
        salary = runnedHours * Number(pricePerHour || 0);
      }

      return {
        worker: r.worker,
        runnedHours,
        salary,
      };
    });

    try {
      const res = await axios.post("/admin/save-hourly-calculation", {
        projectId,
        salaries,
      });

      if (res.data?.success) {
        onSaved?.();
        onClose();
      } else {
        alert("Failed to save hourly data: " + (res.data?.message || ""));
      }
    } catch (err) {
      console.error("Error saving hourly data:", err);
      alert("Error saving hourly data");
    }
  };

  if (!open) return null;

  return (
    <div>
      <div id="hourly-calculation-modal-overlay" className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />

      <div id="hourly-calculation-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Hourly Salary Distribution</h3>
            <button id="close-hourly-modal" onClick={onClose} className="text-gray-600 hover:text-gray-800">✕</button>
          </div>

          <div className="overflow-x-auto">
            <table id="hourly-calculation-table" className="min-w-full border text-left text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 border">Worker Name</th>
                  <th className="p-2 border">Runned Hours</th>
                  <th className="p-2 border">Price Per Hour</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.worker} className="border-b">
                    <td className="p-2 border">{r.worker}</td>
                    <td className="p-2 border">
                      <input
                        type="number"
                        className="runned-hours-input border px-2 py-1 rounded w-24"
                        value={r.runnedHours}
                        onChange={(e) => updateRow(i, { runnedHours: Number(e.target.value || 0) })}
                      />
                    </td>
                    <td className="p-2 border">
                      {r.worker === "Company" ? (
                        <input
                          type="number"
                          className="company-price-input border px-2 py-1 rounded w-24"
                          value={companyPrice}
                          onChange={(e) => setCompanyPrice(Number(e.target.value || 0))}
                        />
                      ) : (
                        <span>{pricePerHour ?? 0}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} id="total-runned-hours" className="p-2 text-right">
                    Total Runned Hours: {totalRunnedHours.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="mt-4 flex justify-end space-x-2">
            <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded">Cancel</button>
            <button id="save-hourly-calculation" onClick={handleSave} className="px-4 py-2 bg-green-600 text-white rounded">Save Data</button>
          </div>
        </div>
      </div>
    </div>
  );
}

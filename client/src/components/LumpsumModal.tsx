import { useState, useEffect } from "react";

interface LumpsumModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  assignedTo: string[]; // list of worker names
  lumpsumPrice: number;
  onSave: (salaries: { worker: string; salary: number }[]) => void;
}

export function LumpsumModal({ isOpen, onClose, projectId, assignedTo, lumpsumPrice, onSave }: LumpsumModalProps) {
  const [salaries, setSalaries] = useState<{ worker: string; salary: number }[]>([]);
  const [remaining, setRemaining] = useState<number>(lumpsumPrice);

  // Initialize salaries when modal opens
  useEffect(() => {
    if (isOpen) {
      const initial = assignedTo.map(worker => ({ worker, salary: 0 }));
      setSalaries(initial);
      setRemaining(lumpsumPrice);
    }
  }, [isOpen, assignedTo, lumpsumPrice]);

  const handleChange = (index: number, value: number) => {
    const newSalaries = [...salaries];
    newSalaries[index].salary = value;
    setSalaries(newSalaries);

    const total = newSalaries.reduce((sum, s) => sum + s.salary, 0);
    setRemaining(lumpsumPrice - total);
  };

  const handleSave = () => {
    const total = salaries.reduce((sum, s) => sum + s.salary, 0);
    if (total !== lumpsumPrice) {
      alert(`Total salaries (${total}) must equal lumpsum price (${lumpsumPrice})`);
      return;
    }
    onSave(salaries);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded shadow-lg w-[550px]">
        <h3 className="text-lg font-bold mb-4">
          Lumpsum Salary Distribution {projectId && `(Project: ${projectId})`}
        </h3>
        <table className="w-full mb-4 border">
          <thead>
            <tr>
              <th className="border p-2">Worker Name</th>
              <th className="border p-2">Salary</th>
              <th className="border p-2">Lumpsum Price</th>
            </tr>
          </thead>
          <tbody>
            {salaries.map((s, i) => (
              <tr key={s.worker}>
                <td className="border p-2">{s.worker}</td>
                <td className="border p-2">
                  <input
                    type="number"
                    value={s.salary}
                    min={0}
                    className="w-full border px-2 py-1"
                    onChange={(e) => handleChange(i, parseFloat(e.target.value) || 0)}
                  />
                </td>
                <td className="border p-2">{remaining}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td className="border p-2 font-bold">Total Lumpsum</td>
              <td className="border p-2">{salaries.reduce((sum, s) => sum + s.salary, 0)}</td>
              <td className="border p-2 font-bold">{remaining}</td>
            </tr>
          </tfoot>
        </table>
        {remaining !== 0 && (
          <div className="text-sm text-red-600 mb-3">
            Remaining must be 0 to approve. Current remaining: {remaining}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button className="px-4 py-2 bg-gray-300 rounded" onClick={onClose}>Cancel</button>
          <button
            className={`px-4 py-2 rounded text-white ${remaining !== 0 ? "bg-gray-400 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"}`}
            onClick={handleSave}
            disabled={remaining !== 0}
          >
            Save & Approve
          </button>
        </div>
      </div>
    </div>
  );
}

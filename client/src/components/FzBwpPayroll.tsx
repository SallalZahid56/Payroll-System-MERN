import { useState } from "react";
import axios from "../utils/axios";

type FzBwpRow = {
  project_id: string;
  project_name: string;
  worker_name: string;
  price_per_entry: number | null;
  sheet_name: string | null;
  profile_name: string;
  entries: number;
  salary: number;
  company: string;
};

export default function FzBwpPayroll() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [results, setResults] = useState<FzBwpRow[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    if (!startDate || !endDate) {
      alert("Select both dates");
      return;
    }

    setLoading(true);
    try {
      const res = await axios.get("/admin/payroll-fz-bwp", {
        params: { start_date: startDate, end_date: endDate },
      });
      setResults(res.data.data || []);
    } catch (err) {
      console.error(err);
      alert("Failed to fetch payroll.");
    } finally {
      setLoading(false);
    }
  };

  const totalSalary = results.reduce((s, r) => s + (r.salary || 0), 0);

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg">
      <div className="flex gap-4 mb-4 items-end">
        <input type="date" className="border px-3 py-2" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        <input type="date" className="border px-3 py-2" value={endDate} onChange={(e) => setEndDate(e.target.value)} />

        <button
          onClick={fetchData}
          className="px-4 py-2 bg-purple-700 text-white rounded"
        >
          {loading ? "Fetching..." : "Fetch Payroll"}
        </button>
      </div>

      <div className="overflow-x-auto border rounded">
        <table className="min-w-[1200px] divide-y">
          <thead className="bg-purple-100">
            <tr>
              {[
                "Project ID",
                "Project Name",
                "Worker",
                "Price",
                "Sheet",
                "Profile",
                "Entries",
                "Salary",
                "Company",
              ].map((h) => (
                <th key={h} className="px-4 py-2 text-left font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {results.map((r, i) => (
              <tr key={i} className="hover:bg-purple-50">
                <td className="px-4 py-2">{r.project_id}</td>
                <td className="px-4 py-2">{r.project_name}</td>
                <td className="px-4 py-2">{r.worker_name}</td>
                <td className="px-4 py-2">{r.price_per_entry ?? "-"}</td>
                <td className="px-4 py-2">{r.sheet_name ?? "-"}</td>
                <td className="px-4 py-2">{r.profile_name}</td>
                <td className="px-4 py-2">{r.entries}</td>
                <td className="px-4 py-2 font-semibold">{(r.salary || 0).toFixed(2)}</td>
                <td className="px-4 py-2">{r.company}</td>
              </tr>
            ))}

            <tr className="bg-purple-50 font-bold">
              <td colSpan={7} className="px-4 py-2">
                Total
              </td>
              <td className="px-4 py-2">{totalSalary.toFixed(2)}</td>
              <td />
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

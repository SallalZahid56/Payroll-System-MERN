import { useState } from "react";
import axios from "../utils/axios";

/* ================= TYPES ================= */
type BWPProfileRow = {
  profile_name: string;
  fixed_debit: number;
  hourly_debit: number;
  total_debit: number;
};

export default function FilteredBWPProfilesPayroll() {
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [results, setResults] = useState<BWPProfileRow[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchData = async () => {
    if (!startDate || !endDate) {
      alert("Please select both start and end dates.");
      return;
    }

    try {
      setLoading(true);

      const res = await axios.get<{
        success: boolean;
        data: BWPProfileRow[];
      }>("/admin/payroll-filtered-profiles-nonbwp", {
        params: {
          start_date: startDate,
          end_date: endDate,
        },
      });

      if (res.data.success) {
        // Convert string numbers to actual numbers
        const converted = res.data.data.map((r) => ({
          profile_name: r.profile_name,
          fixed_debit: parseFloat(r.fixed_debit as unknown as string),
          hourly_debit: parseFloat(r.hourly_debit as unknown as string),
          total_debit: parseFloat(r.total_debit as unknown as string),
        }));
        setResults(converted);
      } else {
        alert("Failed to fetch BWP filtered payroll");
      }
    } catch (err) {
      console.error(err);
      alert("Error fetching BWP filtered payroll");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Calculate totals
  const totals = results.reduce(
    (acc, r) => {
      acc.fixed_debit += r.fixed_debit;
      acc.hourly_debit += r.hourly_debit;
      acc.total_debit += r.total_debit;
      return acc;
    },
    {
      fixed_debit: 0,
      hourly_debit: 0,
      total_debit: 0,
    }
  );

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg w-full">
      {/* ================= FILTERS ================= */}
      <div className="flex flex-wrap gap-4 mb-4 items-end">
        <div className="flex flex-col">
          <label className="text-sm text-gray-700">Start Date</label>
          <input
            type="date"
            className="border rounded px-3 py-2"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>

        <div className="flex flex-col">
          <label className="text-sm text-gray-700">End Date</label>
          <input
            type="date"
            className="border rounded px-3 py-2"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>

        <button
          onClick={fetchData}
          disabled={loading}
          className="px-4 py-2 bg-purple-700 text-white rounded hover:bg-purple-800 transition"
        >
          {loading ? "Fetching..." : "Fetch Payroll"}
        </button>
      </div>

      {/* ================= TABLE ================= */}
      <div className="relative w-full overflow-x-auto border rounded-lg">
        {results.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            No payroll data
          </div>
        ) : (
          <table className="min-w-[800px] divide-y divide-gray-200">
            <thead className="bg-purple-100 sticky top-0 z-10">
              <tr>
                {["Profile Name", "Fixed Debit", "Hourly Debit", "Total Debit"].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-purple-900 font-semibold uppercase whitespace-nowrap"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {results.map((r: BWPProfileRow, i: number) => (
                <tr key={i} className="hover:bg-purple-50">
                  <td className="px-4 py-2 whitespace-nowrap">{r.profile_name}</td>
                  <td className="px-4 py-2">{r.fixed_debit.toFixed(2)}</td>
                  <td className="px-4 py-2">{r.hourly_debit.toFixed(2)}</td>
                  <td className="px-4 py-2 font-semibold">{r.total_debit.toFixed(2)}</td>
                </tr>
              ))}

              {/* ✅ TOTAL ROW */}
              <tr className="bg-purple-50 font-semibold">
                <td className="px-4 py-2">Total</td>
                <td className="px-4 py-2">{totals.fixed_debit.toFixed(2)}</td>
                <td className="px-4 py-2">{totals.hourly_debit.toFixed(2)}</td>
                <td className="px-4 py-2">{totals.total_debit.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

import { useState } from "react";
import axios from "../utils/axios";

/* ================= TYPES ================= */
type FilteredProfileRow = {
  profile_name: string;
  fixed_profile_debit: number;
  hourly_profile_debit: number;
  total_profile_debit: number;
};

export default function FilteredProfilesPayroll() {
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [results, setResults] = useState<FilteredProfileRow[]>([]);
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
        data: FilteredProfileRow[];
      }>("/admin/payroll-filtered-profiles", {
        params: {
          start_date: startDate,
          end_date: endDate,
        },
      });

      if (res.data.success) {
        setResults(res.data.data || []);
      } else {
        alert("Failed to fetch filtered payroll");
      }
    } catch (err) {
      console.error(err);
      alert("Error fetching filtered payroll");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Calculate totals
  const totals = results.reduce(
    (acc, r) => {
      acc.fixed_profile_debit += r.fixed_profile_debit;
      acc.hourly_profile_debit += r.hourly_profile_debit;
      acc.total_profile_debit += r.total_profile_debit;
      return acc;
    },
    {
      fixed_profile_debit: 0,
      hourly_profile_debit: 0,
      total_profile_debit: 0,
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
              {results.map((r: FilteredProfileRow, i: number) => (
                <tr key={i} className="hover:bg-purple-50">
                  <td className="px-4 py-2 whitespace-nowrap">{r.profile_name}</td>
                  <td className="px-4 py-2">{r.fixed_profile_debit.toFixed(2)}</td>
                  <td className="px-4 py-2">{r.hourly_profile_debit.toFixed(2)}</td>
                  <td className="px-4 py-2 font-semibold">
                    {r.total_profile_debit.toFixed(2)}
                  </td>
                </tr>
              ))}

              {/* ✅ TOTAL ROW */}
              <tr className="bg-purple-50 font-semibold">
                <td className="px-4 py-2">Total</td>
                <td className="px-4 py-2">{totals.fixed_profile_debit.toFixed(2)}</td>
                <td className="px-4 py-2">{totals.hourly_profile_debit.toFixed(2)}</td>
                <td className="px-4 py-2">{totals.total_profile_debit.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

import { useState } from "react";
import axios from "../utils/axios";

/* ================= TYPES ================= */
type ProfilePayrollRow = {
  profile_name: string;
  fixed_profile_debit: number;
  hourly_profile_debit: number;
  total_profile_debit: number;
  fixed_entries: number;
  hourly_entries: number;
  total_entries: number;
};

export default function AllProfilesPayroll() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [results, setResults] = useState<ProfilePayrollRow[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchProfilesPayroll = async () => {
    if (!startDate || !endDate) {
      return alert("Please select both start and end dates.");
    }

    try {
      setLoading(true);
      const res = await axios.get<{
        success: boolean;
        data: ProfilePayrollRow[];
        message?: string;
      }>(
        `/admin/payroll-profiles?start_date=${startDate}&end_date=${endDate}`
      );

      if (res.data.success) {
        setResults(res.data.data ?? []);
      } else {
        alert(res.data.message || "Failed to fetch profile payroll");
      }
    } catch (err) {
      console.error(err);
      alert("Error fetching profile payroll");
    } finally {
      setLoading(false);
    }
  };

  /* ================= TOTAL ROW ================= */
  const totalRow = results.reduce(
    (acc, r) => {
      acc.fixed_profile_debit += r.fixed_profile_debit;
      acc.hourly_profile_debit += r.hourly_profile_debit;
      acc.total_profile_debit += r.total_profile_debit;
      acc.fixed_entries += r.fixed_entries;
      acc.hourly_entries += r.hourly_entries;
      acc.total_entries += r.total_entries;
      return acc;
    },
    {
      fixed_profile_debit: 0,
      hourly_profile_debit: 0,
      total_profile_debit: 0,
      fixed_entries: 0,
      hourly_entries: 0,
      total_entries: 0,
    }
  );

  return (
    <div className="bg-white shadow-lg rounded-xl p-6 w-full">
      {/* ================= FILTERS ================= */}
      <div className="flex flex-wrap gap-4 items-end mb-4">
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
          className="px-4 py-2 bg-purple-700 text-white rounded"
          onClick={fetchProfilesPayroll}
          disabled={loading}
        >
          {loading ? "Fetching..." : "Fetch Profiles Payroll"}
        </button>
      </div>

      {/* ================= TABLE ================= */}
      <div className="relative w-full overflow-x-auto border rounded-lg">
        {results.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            No payroll data
          </div>
        ) : (
          <table className="min-w-[1200px] divide-y divide-gray-200">
            <thead className="bg-purple-100 sticky top-0 z-10">
              <tr>
                {[
                  "Profile Name",
                  "Fixed Debit",
                  "Hourly Debit",
                  "Total Debit",
                  "Fixed Entries",
                  "Hourly Entries",
                  "Total Entries",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-purple-900 font-semibold uppercase whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {results.map((row, idx) => (
                <tr key={idx} className="hover:bg-purple-50">
                  <td className="px-4 py-2 whitespace-nowrap">
                    {row.profile_name}
                  </td>
                  <td className="px-4 py-2">
                    {row.fixed_profile_debit.toFixed(2)}
                  </td>
                  <td className="px-4 py-2">
                    {row.hourly_profile_debit.toFixed(2)}
                  </td>
                  <td className="px-4 py-2">
                    {row.total_profile_debit.toFixed(2)}
                  </td>
                  <td className="px-4 py-2">{row.fixed_entries}</td>
                  <td className="px-4 py-2">{row.hourly_entries}</td>
                  <td className="px-4 py-2">{row.total_entries}</td>
                </tr>
              ))}

              {/* TOTAL */}
              <tr className="bg-purple-50 font-semibold">
                <td className="px-4 py-2">Total</td>
                <td className="px-4 py-2">
                  {totalRow.fixed_profile_debit.toFixed(2)}
                </td>
                <td className="px-4 py-2">
                  {totalRow.hourly_profile_debit.toFixed(2)}
                </td>
                <td className="px-4 py-2">
                  {totalRow.total_profile_debit.toFixed(2)}
                </td>
                <td className="px-4 py-2">{totalRow.fixed_entries}</td>
                <td className="px-4 py-2">{totalRow.hourly_entries}</td>
                <td className="px-4 py-2">{totalRow.total_entries}</td>
              </tr>
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
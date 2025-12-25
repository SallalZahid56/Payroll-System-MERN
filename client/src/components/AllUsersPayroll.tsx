import { useState } from "react";
import axios from "../utils/axios";

// API response type
type AllUsersPayrollApiRow = {
  worker_name: string;
  fixed_salary: number;
  hourly_salary: number;
  grand_total: number;
  fixed_entries: number;
  hourly_entries: number;
  total_entries: number;
  rs_8_entries: number;
  rs_12_entries: number;
  rs_16_entries: number;
  rs_4_entries: number;
  other_entries: number;
};

// Table row type (same here since no mapping needed)
type PayrollRow = AllUsersPayrollApiRow;

export default function AllUsersPayroll() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [payrollResults, setPayrollResults] = useState<PayrollRow[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAllUsersPayroll = async () => {
    if (!startDate || !endDate) return alert("Please select both start and end dates.");

    try {
      setLoading(true);
      const res = await axios.get<{ success: boolean; data: PayrollRow[]; message?: string }>(
        `/admin/payroll/all-users?start_date=${startDate}&end_date=${endDate}`
      );

      if (res.data.success) {
        setPayrollResults(res.data.data ?? []);
      } else {
        alert("Failed to fetch payroll data: " + res.data.message);
      }
    } catch (err) {
      console.error("Error fetching payroll data:", err);
      alert("Error fetching payroll data");
    } finally {
      setLoading(false);
    }
  };

  const totalRow = payrollResults.reduce(
    (acc, row) => {
      acc.fixed_salary += row.fixed_salary;
      acc.hourly_salary += row.hourly_salary;
      acc.grand_total += row.grand_total;
      acc.fixed_entries += row.fixed_entries;
      acc.hourly_entries += row.hourly_entries;
      acc.total_entries += row.total_entries;
      acc.rs_4_entries += row.rs_4_entries;
      acc.rs_8_entries += row.rs_8_entries;
      acc.rs_12_entries += row.rs_12_entries;
      acc.rs_16_entries += row.rs_16_entries;
      acc.other_entries += row.other_entries;
      return acc;
    },
    {
      fixed_salary: 0,
      hourly_salary: 0,
      grand_total: 0,
      fixed_entries: 0,
      hourly_entries: 0,
      total_entries: 0,
      rs_4_entries: 0,
      rs_8_entries: 0,
      rs_12_entries: 0,
      rs_16_entries: 0,
      other_entries: 0,
    }
  );

  return (
    <div className="bg-white shadow-lg rounded-xl p-6 w-full">
      {/* Filters */}
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
          onClick={fetchAllUsersPayroll}
          disabled={loading}
        >
          {loading ? "Fetching..." : "Fetch All Users Payroll"}
        </button>
      </div>

      {/* TABLE SCROLL AREA */}
      <div className="relative w-full overflow-x-auto border rounded-lg">
        {payrollResults.length === 0 ? (
          <div className="text-center py-6 text-gray-500">No payroll data</div>
        ) : (
          <table className="min-w-[1800px] divide-y divide-gray-200">
            <thead className="bg-purple-100 sticky top-0 z-10">
              <tr>
                {[
                  "Worker Name",
                  "Fixed Salary",
                  "Hourly Salary",
                  "Grand Total",
                  "Fixed Entries",
                  "Hourly Entries",
                  "Total Entries",
                  "RS 8 Entries",
                  "RS 12 Entries",
                  "RS 16 Entries",
                  "RS 4 Entries",
                  "Other Entries",
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
              {payrollResults.map((row, idx) => (
                <tr key={idx} className="hover:bg-purple-50">
                  <td className="px-4 py-2 whitespace-nowrap">{row.worker_name}</td>
                  <td className="px-4 py-2">{row.fixed_salary.toFixed(2)}</td>
                  <td className="px-4 py-2">{row.hourly_salary.toFixed(2)}</td>
                  <td className="px-4 py-2">{row.grand_total.toFixed(2)}</td>
                  <td className="px-4 py-2">{row.fixed_entries}</td>
                  <td className="px-4 py-2">{row.hourly_entries}</td>
                  <td className="px-4 py-2">{row.total_entries}</td>
                  <td className="px-4 py-2">{row.rs_8_entries}</td>
                  <td className="px-4 py-2">{row.rs_12_entries}</td>
                  <td className="px-4 py-2">{row.rs_16_entries}</td>
                  <td className="px-4 py-2">{row.rs_4_entries}</td>
                  <td className="px-4 py-2">{row.other_entries}</td>
                </tr>
              ))}

              {/* TOTAL ROW */}
              <tr className="bg-purple-50 font-semibold">
                <td className="px-4 py-2">Total</td>
                <td className="px-4 py-2">{totalRow.fixed_salary.toFixed(2)}</td>
                <td className="px-4 py-2">{totalRow.hourly_salary.toFixed(2)}</td>
                <td className="px-4 py-2">{totalRow.grand_total.toFixed(2)}</td>
                <td className="px-4 py-2">{totalRow.fixed_entries}</td>
                <td className="px-4 py-2">{totalRow.hourly_entries}</td>
                <td className="px-4 py-2">{totalRow.total_entries}</td>
                <td className="px-4 py-2">{totalRow.rs_8_entries}</td>
                <td className="px-4 py-2">{totalRow.rs_12_entries}</td>
                <td className="px-4 py-2">{totalRow.rs_16_entries}</td>
                <td className="px-4 py-2">{totalRow.rs_4_entries}</td>
                <td className="px-4 py-2">{totalRow.other_entries}</td>
              </tr>
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
import { useEffect, useState } from "react";
import axios from "../utils/axios";

type ProfileOption = { _id: string; name: string; role: string };
type PayrollRow = {
  project_id: string;
  project_name: string;
  profile_name?: string;
  profile_debit?: number; 
  salary?: number;
  no_of_entries?: number;
};

export default function ProfilePayroll() {
  const [profiles, setProfiles] = useState<ProfileOption[]>([]);
  const [selectedProfile, setSelectedProfile] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [payrollResults, setPayrollResults] = useState<PayrollRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        const res = await axios.get("/admin/get-profiles");
        setProfiles(res.data?.profiles ?? []);
      } catch (err) {
        console.error("Error fetching profiles:", err);
      }
    };
    fetchProfiles();
  }, []);

 const fetchProfilePayroll = async () => {
    if (!selectedProfile) return alert("Please select a profile.");
    if (!startDate || !endDate) return alert("Please select both start and end dates.");

    try {
      setLoading(true);
      const res = await axios.get<{ success: boolean; data: PayrollRow[]; message?: string }>(
        `/admin/payroll-profile/${encodeURIComponent(selectedProfile)}?start_date=${startDate}&end_date=${endDate}`
      );

      if (res.data.success) {
        const mappedData = res.data.data.map(row => ({
          ...row,
          salary: row.profile_debit ?? 0,
        }));
        setPayrollResults(mappedData);
      } else {
        alert("Failed to fetch payroll data: " + res.data.message);
      }
    } catch (err) {
      const error = err as { response?: { status?: number } };
      if (error?.response?.status === 404) setPayrollResults([]);
      else {
        console.error("Error fetching payroll data:", err);
        alert("Error fetching payroll data");
      }
    } finally {
      setLoading(false);
    }
  };

  const totalSalary = payrollResults.reduce((acc, row) => acc + Number(row.salary || 0), 0);
  const totalEntries = payrollResults.reduce((acc, row) => acc + Number(row.no_of_entries || 0), 0);

  return (
    <div className="min-w-[800px] bg-white shadow-lg rounded-xl overflow-x-auto p-6">
      <div className="flex gap-4 items-end mb-4">
        <div className="flex flex-col">
          <label className="text-sm text-gray-700">Profile</label>
          <select
            className="border rounded px-3 py-2"
            value={selectedProfile}
            onChange={(e) => setSelectedProfile(e.target.value)}
          >
            <option value="">Select a Profile</option>
            {profiles.map((p) => (
              <option key={p._id} value={p.name}>
                {p.name} ({p.role})
              </option>
            ))}
          </select>
        </div>

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
          className="ml-4 px-4 py-2 bg-purple-700 text-white rounded"
          onClick={fetchProfilePayroll}
          disabled={loading}
        >
          {loading ? "Fetching..." : "Fetch"}
        </button>
      </div>

      <div className="min-w-full overflow-x-auto">
        {payrollResults.length === 0 ? (
          <div className="text-center py-4">No payroll data</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 rounded-xl">
            <thead className="bg-purple-100">
              <tr>
                {["Project ID","Project Name","Profile Name","Salary","Entries"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-purple-900 font-semibold uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {payrollResults.map((row, idx) => (
                <tr key={idx} className="hover:bg-purple-50 transition-colors">
                  <td className="px-4 py-2">{row.project_id}</td>
                  <td className="px-4 py-2">{row.project_name}</td>
                  <td className="px-4 py-2">{row.profile_name ?? "-"}</td>
                  <td className="px-4 py-2">{row.salary?.toFixed?.(2) ?? row.salary}</td>
                  <td className="px-4 py-2">{row.no_of_entries}</td>
                </tr>
              ))}
              <tr className="bg-purple-50 font-semibold">
                <td className="px-4 py-2" colSpan={3}>Total</td>
                <td className="px-4 py-2">{totalSalary.toFixed(2)}</td>
                <td className="px-4 py-2">{totalEntries}</td>
              </tr>
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

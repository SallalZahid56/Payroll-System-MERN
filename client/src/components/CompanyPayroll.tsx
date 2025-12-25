import { useEffect, useState } from "react";
import axios from "../utils/axios";

type CompanyPayrollRow = {
  project_id: string;
  project_name: string;
  profile_name: string;
  sheet_name: string;
  price_per_entry: number;
  worker_entries: number;
  profile_debit: number;
  company: string;
};

export default function CompanyPayroll() {
  const [companies, setCompanies] = useState<string[]>([]);
  const [company, setCompany] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [results, setResults] = useState<CompanyPayrollRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    axios.get("/admin/companies").then((res) => {
      if (res.data.success) setCompanies(res.data.data);
    });
  }, []);

  const fetchData = async () => {
    if (!company || !startDate || !endDate) {
      alert("Select company and dates");
      return;
    }

    setLoading(true);
    const res = await axios.get(`/admin/payroll-company/${company}`, {
      params: { start_date: startDate, end_date: endDate },
    });
    setResults(res.data.data || []);
    setLoading(false);
  };

  const total = results.reduce((s, r) => s + r.profile_debit, 0);

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg">
      {/* FILTERS */}
      <div className="flex gap-4 mb-4 items-end flex-wrap">
        <select
          className="border rounded px-3 py-2"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
        >
          <option value="">Select Company</option>
          {companies.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <input type="date" className="border px-3 py-2" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        <input type="date" className="border px-3 py-2" value={endDate} onChange={(e) => setEndDate(e.target.value)} />

        <button
          onClick={fetchData}
          className="px-4 py-2 bg-purple-700 text-white rounded"
        >
          {loading ? "Fetching..." : "Fetch Payroll"}
        </button>
      </div>

      {/* TABLE */}
      <div className="overflow-x-auto border rounded">
        <table className="min-w-[1200px] divide-y">
          <thead className="bg-purple-100">
            <tr>
              {[
                "Project ID",
                "Project Name",
                "Profile",
                "Sheet",
                "Price",
                "Entries",
                "Debit",
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
                <td className="px-4 py-2">{r.profile_name}</td>
                <td className="px-4 py-2">{r.sheet_name}</td>
                <td className="px-4 py-2">{r.price_per_entry}</td>
                <td className="px-4 py-2">{r.worker_entries}</td>
                <td className="px-4 py-2 font-semibold">{r.profile_debit.toFixed(2)}</td>
                <td className="px-4 py-2">{r.company}</td>
              </tr>
            ))}

            <tr className="bg-purple-50 font-bold">
              <td colSpan={6} className="px-4 py-2">
                Total
              </td>
              <td className="px-4 py-2">{total.toFixed(2)}</td>
              <td />
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

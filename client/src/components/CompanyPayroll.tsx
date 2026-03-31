import { useEffect, useState } from "react";
import axios from "../utils/axios";

type CompanyPayrollRow = {
  project_id: string;
  project_name: string;
  profile_name: string;
  sheet_name: string;
  price_per_entry?: string | number;       // hourly
  price_worker_one?: number | null;        // add these
  price_worker_two?: number | null;
  price_worker_three?: number | null;
  price_worker_four?: number | null;
  price_worker_five?: number | null;
  lumpsum_price?: number | null;
  worker_entries: number;
  profile_debit: number;
  company: string;
  fixed_option?: string;
};

const multiEntryOptions = [
  "Double Entry",
  "Triple Entry",
  "Fourth Entry",
  "Fifth Entry",
];

export default function CompanyPayroll() {
  const [companies, setCompanies] = useState<string[]>([]);
  const [company, setCompany] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [results, setResults] = useState<CompanyPayrollRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterOption, setFilterOption] = useState("All");

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

  const filteredResults = results.filter((r) => {
    // If backend doesn't send fixed_option, don't block results
    if (!r.fixed_option || filterOption === "All") return true;

    if (filterOption === "Single Entry") {
      return r.fixed_option === "Single Entry";
    }

    if (filterOption === "Multi Entry") {
      return multiEntryOptions.includes(r.fixed_option);
    }

    if (filterOption === "Lumpsum") {
      return r.fixed_option === "Lumpsum";
    }

    return true;
  });

  // TOTAL BASED ON FILTERED RESULTS
  const total = filteredResults.reduce(
    (sum, r) => sum + r.profile_debit,
    0
  );

  const getPriceDisplay = (r: CompanyPayrollRow): string => {
    // Hourly projects already have price_per_entry
    if (!r.fixed_option) return r.price_per_entry?.toString() ?? "—";

    const option = r.fixed_option;

    if (option === "Lumpsum") return r.lumpsum_price?.toString() ?? "—";

    const priceMap: Record<string, (number | null | undefined)[]> = {
      "Single Entry": [r.price_worker_one],
      "Double Entry": [r.price_worker_one, r.price_worker_two],
      "Triple Entry": [r.price_worker_one, r.price_worker_two, r.price_worker_three],
      "Fourth Entry": [r.price_worker_one, r.price_worker_two, r.price_worker_three, r.price_worker_four],
      "Fifth Entry": [r.price_worker_one, r.price_worker_two, r.price_worker_three, r.price_worker_four, r.price_worker_five],
    };

    const prices = priceMap[option] ?? [r.price_worker_one];
    return prices.filter((p) => p !== null && p !== undefined && p !== 0).join(", ") || "—";
  };

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

        <input
          type="date"
          className="border px-3 py-2"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />

        <input
          type="date"
          className="border px-3 py-2"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />

        {/* ✅ FIXED OPTION FILTER */}
        <select
          className="border rounded px-3 py-2"
          value={filterOption}
          onChange={(e) => setFilterOption(e.target.value)}
        >
          <option value="All">All</option>
          <option value="Single Entry">Single Entry</option>
          <option value="Multi Entry">Multi Entry</option>
          <option value="Lumpsum">Lumpsum</option>
        </select>

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
                "Fixed Option",
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
            {filteredResults.map((r, i) => (
              <tr key={i} className="hover:bg-purple-50">
                <td className="px-4 py-2">{r.project_id}</td>
                <td className="px-4 py-2">{r.project_name}</td>
                <td className="px-4 py-2">{r.profile_name}</td>
                <td className="px-4 py-2">{r.sheet_name}</td>
                <td className="px-4 py-2 font-semibold text-purple-700">
                  {r.fixed_option ?? "—"}
                </td>
                <td className="px-4 py-2">{getPriceDisplay(r)}</td>
                <td className="px-4 py-2">{r.worker_entries}</td>
                <td className="px-4 py-2 font-semibold">
                  {r.profile_debit.toFixed(2)}
                </td>
                <td className="px-4 py-2">{r.company}</td>
              </tr>
            ))}

            <tr className="bg-purple-50 font-bold">
              <td colSpan={7} className="px-4 py-2">
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

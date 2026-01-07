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
        const raw = res.data.data ?? [];

        // normalize and group by worker name (tolerant to spaces/punctuation/case)
        const normalize = (s: string) =>
          String(s || "")
            .normalize("NFKD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, "")
            .replace(/[^a-z0-9]/gi, "")
            .toLowerCase()
            .trim();

        const map = new Map<string, any>();

        raw.forEach((r) => {
          const orig = (r.worker_name || "").trim();
          const key = normalize(orig) || "__unknown__";

          if (!map.has(key)) {
            map.set(key, {
              worker_name: orig,
              fixed_salary: 0,
              hourly_salary: 0,
              grand_total: 0,
              fixed_entries: 0,
              hourly_entries: 0,
              total_entries: 0,
              rs_8_entries: 0,
              rs_12_entries: 0,
              rs_16_entries: 0,
              rs_4_entries: 0,
              other_entries: 0,
              _nameCounts: new Map<string, number>(),
            });
          }

          const acc = map.get(key);
          acc.fixed_salary += Number(r.fixed_salary || 0);
          acc.hourly_salary += Number(r.hourly_salary || 0);
          acc.grand_total += Number(r.grand_total || 0);
          acc.fixed_entries += Number(r.fixed_entries || 0);
          acc.hourly_entries += Number(r.hourly_entries || 0);
          acc.total_entries += Number(r.total_entries || 0);
          acc.rs_8_entries += Number(r.rs_8_entries || 0);
          acc.rs_12_entries += Number(r.rs_12_entries || 0);
          acc.rs_16_entries += Number(r.rs_16_entries || 0);
          acc.rs_4_entries += Number(r.rs_4_entries || 0);
          acc.other_entries += Number(r.other_entries || 0);

          const cnt = acc._nameCounts.get(orig) || 0;
          acc._nameCounts.set(orig, cnt + 1);
        });

        // build grouped array, pick a representative display name (most common variant)
        const grouped: PayrollRow[] = Array.from(map.values()).map((v) => {
          let bestName = v.worker_name;
          let bestCount = 0;
          v._nameCounts.forEach((count: number, name: string) => {
            if (count > bestCount) {
              bestCount = count;
              bestName = name;
            } else if (count === bestCount) {
              // tie-breaker: prefer name with no extra spaces (shorter trimmed)
              if (name.trim().length < bestName.trim().length) bestName = name;
            }
          });

          return {
            worker_name: bestName,
            fixed_salary: Number(v.fixed_salary || 0),
            hourly_salary: Number(v.hourly_salary || 0),
            grand_total: Number(v.grand_total || 0),
            fixed_entries: Number(v.fixed_entries || 0),
            hourly_entries: Number(v.hourly_entries || 0),
            total_entries: Number(v.total_entries || 0),
            rs_8_entries: Number(v.rs_8_entries || 0),
            rs_12_entries: Number(v.rs_12_entries || 0),
            rs_16_entries: Number(v.rs_16_entries || 0),
            rs_4_entries: Number(v.rs_4_entries || 0),
            other_entries: Number(v.other_entries || 0),
          };
        });

        setPayrollResults(grouped);
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

  const handleDownloadPdf = async () => {
    if (payrollResults.length === 0) return alert("No payroll data to download.");

    try {
      const { default: jsPDF } = await import("jspdf");
      await import("jspdf-autotable");

      const doc = new jsPDF();
      const title = `All Users Payroll (${startDate} to ${endDate})`;
      doc.setFontSize(12);
      doc.text(title, 14, 14);

      const head = [[
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
      ]];

      const body = payrollResults.map(r => [
        r.worker_name || "",
        (Number(r.fixed_salary) || 0).toFixed(2),
        (Number(r.hourly_salary) || 0).toFixed(2),
        (Number(r.grand_total) || 0).toFixed(2),
        String(r.fixed_entries || ""),
        String(r.hourly_entries || ""),
        String(r.total_entries || ""),
        String(r.rs_8_entries || ""),
        String(r.rs_12_entries || ""),
        String(r.rs_16_entries || ""),
        String(r.rs_4_entries || ""),
        String(r.other_entries || ""),
      ]);

      // totals row
      body.push([
        "Total",
        totalRow.fixed_salary.toFixed(2),
        totalRow.hourly_salary.toFixed(2),
        totalRow.grand_total.toFixed(2),
        String(totalRow.fixed_entries),
        String(totalRow.hourly_entries),
        String(totalRow.total_entries),
        String(totalRow.rs_8_entries),
        String(totalRow.rs_12_entries),
        String(totalRow.rs_16_entries),
        String(totalRow.rs_4_entries),
        String(totalRow.other_entries),
      ]);

      ;(doc as unknown as { autoTable: (opts: { head: unknown; body: unknown; startY?: number; styles?: unknown; headStyles?: unknown }) => void })
        .autoTable({ head, body, startY: 20, styles: { fontSize: 8 }, headStyles: { fillColor: [147, 51, 234] } });

      const filename = `all_users_payroll_${startDate}_${endDate}.pdf`;
      doc.save(filename);
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("Failed to generate PDF. Make sure dependencies are installed.");
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
        <button
          className="px-4 py-2 ml-2 bg-blue-600 text-white rounded"
          onClick={handleDownloadPdf}
          disabled={payrollResults.length === 0}
        >
          Download PDF
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
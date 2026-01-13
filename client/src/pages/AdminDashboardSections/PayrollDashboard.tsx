import { useState } from "react";
import UserPayroll from "../../components/UserPayroll";
import ProfilePayroll from "../../components/ProfilePayroll";
import AllUsersPayroll from "../../components/AllUsersPayroll";
import AllProfilesPayroll from "../../components/AllProfilesPayroll";
import FilteredProfilesPayroll from "../../components/FilteredProfilesPayroll";
import FilteredBWPProfilesPayroll from "../../components/FilteredBwpPayroll";
import CompanyPayroll from "../../components/CompanyPayroll";
import InfonavBwpPayroll from "../../components/InfonavBwpPayroll";
import FzBwpPayroll from "../../components/FzBwpPayroll";


interface PayrollMenuItem {
  id: string;
  label: string;
}

const payrollMenuItems: PayrollMenuItem[] = [
  { id: "user-payroll", label: "User Payroll" },
  { id: "profile-payroll", label: "Profile Payroll" },
  { id: "all-users-payroll", label: "All Users Payroll" },
  { id: "all-profiles-payroll", label: "All Profiles Payroll" },
  { id: "filtered-profiles-payroll", label: "Filtered Payroll (Team RYK)" },
  { id: "filtered-profiles-payroll-nonbwp", label: "Filtered Payroll (Team BWP)" },
  { id: "company-payroll", label: "Company Payroll" },
  { id: "bwp-payroll", label: "Infonav - Team BWP Payroll" },
  { id: "freelancerszone-bwp-payroll", label: "FreelancersZone - Team BWP Payroll" },
  { id: "categorization-payroll", label: "Categorization" },
];

interface PayrollDashboardProps {
  onCardClick: (id: string) => void;
}

export default function PayrollDashboard({ onCardClick }: PayrollDashboardProps) {
  const [activePayroll, setActivePayroll] = useState<string | null>(null);

  const handleCardClick = (id: string) => {
    setActivePayroll(id);
    onCardClick(id);
  };

  return (
    <div>
      {!activePayroll ? (
        <>
          <h1 className="text-3xl font-bold text-purple-900 mb-6">Payroll Section</h1>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {payrollMenuItems.map((item) => (
              <div
                key={item.id}
                onClick={() => handleCardClick(item.id)}
                className="cursor-pointer p-6 bg-white rounded-xl shadow-lg hover:shadow-2xl transform hover:-translate-y-1 transition-all text-center"
              >
                <h2 className="text-lg font-semibold text-purple-800">{item.label}</h2>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="flex space-x-4">
          {/* Sidebar buttons */}
          <div className="w-32 flex-shrink-0 flex flex-col space-y-2">
            {payrollMenuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleCardClick(item.id)}
                className={`px-2 py-2 text-left rounded-md text-sm font-medium transition-colors ${activePayroll === item.id
                    ? "bg-purple-700 text-white shadow-lg"
                    : "bg-white text-purple-900 border border-gray-300 hover:bg-purple-100"
                  }`}
              >
                {item.label}
              </button>
            ))}
            <button
              onClick={() => setActivePayroll(null)}
              className="mt-auto px-3 py-2 bg-red-500 text-white rounded-md text-sm hover:bg-red-600 transition"
            >
              Back to Cards
            </button>
          </div>

          {/* Payroll Component */}
          <div className="flex-1 min-w-0">
            {activePayroll === "user-payroll" && <UserPayroll />}
            {activePayroll === "profile-payroll" && <ProfilePayroll />}
            {activePayroll === "all-users-payroll" && <AllUsersPayroll />}
            {activePayroll === "all-profiles-payroll" && <AllProfilesPayroll />}
            {activePayroll === "filtered-profiles-payroll" && <FilteredProfilesPayroll />}
            {activePayroll === "filtered-profiles-payroll-nonbwp" && <FilteredBWPProfilesPayroll />}
            {activePayroll === "company-payroll" && <CompanyPayroll />}
            {activePayroll === "bwp-payroll" && <InfonavBwpPayroll />}
            {activePayroll === "freelancerszone-bwp-payroll" && <FzBwpPayroll />}
            {/* Add other payroll components as needed */}
          </div>
        </div>
      )}
    </div>
  );
}
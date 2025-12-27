import { useState } from "react";
import Sidebar from "../components/Sidebar";
import UserSubmittedProjectsTable from "./AdminDashboardSections/UserSubmittedProjectsTable";

export default function UserDashboard() {
  const [activeSection, setActiveSection] = useState("dashboard");

  const renderSection = () => {
    switch (activeSection) {
      case "dashboard":
        return <UserSubmittedProjectsTable />;
      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        hideUsers
        hideUnpricedProjects
      />
      <div className="flex-1 p-6 bg-gray-50 overflow-x-hidden overflow-y-auto">
        {renderSection()}
      </div>
    </div>
  );
}

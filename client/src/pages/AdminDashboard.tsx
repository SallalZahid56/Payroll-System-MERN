import { useState } from "react";
import Sidebar from "../components/Sidebar";
import AdminFormsMenu from "./AdminFormsMenu";
import FixedUnassignedTable from "./AdminDashboardSections/FixedUnassignedTable";
import FixedAssignedTable from "./AdminDashboardSections/FixedAssignedTable";
import HourlyAssignedTable from "./AdminDashboardSections/HourlyAssignedTable";
import HourlyUnassignedTable from "./AdminDashboardSections/HourlyUnassignedTable";
import UsersSection from "./AdminDashboardSections/UsersSection";
import UnpricedUnassignedTable from "./AdminDashboardSections/UnpricedUnassignedTable";
import UnpricedAssignedTable from "./AdminDashboardSections/UnpricedAssignedTable";
import PayrollDashboard from "./AdminDashboardSections/PayrollDashboard";
import SubmittedProjectsTable from "./AdminDashboardSections/SubmittedProjectsTable";
import CompletedProjectsTable from "./AdminDashboardSections/CompletedProjects";
import PendingRevisions from "./AdminDashboardSections/PendingRevisions";
import TopBar from "../components/TopBar";
import DeleteProjectTable from "./AdminDashboardSections/DeleteProjectTable";
import ProjectExpenseTable from "./AdminDashboardSections/ProjectExpenseTable";


export default function AdminDashboard() {
  const [activeSection, setActiveSection] = useState("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false); // collapse state

  const handlePayrollCardClick = () => {
    setActiveSection("payroll");
    setSidebarCollapsed(true);
  };


  const renderSection = () => {
    switch (activeSection) {
      case "dashboard":
        return (
          <div className="space-y-10">
            <FixedUnassignedTable />
            <FixedAssignedTable />
            <HourlyUnassignedTable />
            <HourlyAssignedTable />
          </div>
        );
      case "unpriced-projects":
        return (
          <div className="space-y-10">
            <UnpricedUnassignedTable />
            <UnpricedAssignedTable />
          </div>
        );
      case "add-project":
        return <AdminFormsMenu />;
      case "users":
        return <UsersSection />;
      case "payroll":
        return <PayrollDashboard onCardClick={handlePayrollCardClick} />; // pass collapse handler
      case "completed-projects":
        return <CompletedProjectsTable />;
      case "pending-revisions":
        return <PendingRevisions />;
      case "submitted-projects":
        return <SubmittedProjectsTable />;
      case "delete-projects":
        return <DeleteProjectTable />;
      case "project-expense":
        return <ProjectExpenseTable />;
      default:
        return <div className="p-4 text-xl">Welcome, Admin!</div>;
    }
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        showDeleteProject // only admin dashboard shows delete-projects
        showProjectExpense // show Project Expense in admin dashboard
      />
      <div className="flex-1 flex flex-col bg-gray-50 overflow-x-hidden">
        <TopBar /> {/* LOGOUT BUTTON */}
        <div className="flex-1 p-6 overflow-y-auto">
          {renderSection()}
        </div>
      </div>
    </div>
  );
}

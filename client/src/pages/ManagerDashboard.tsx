import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import ManagerAssignedProjectsTable from "./AdminDashboardSections/ManagerAssignedProjectsTable";
import ManagerHourlyAssignedProjectTable from "./AdminDashboardSections/ManagerHourlyAssignedProjectTable";
import ManagerUnassignedProjectsTable from "./AdminDashboardSections/ManagerUnassignedProjectsTable";
import ManagerHourlyUnassignedProjectsTable from "./AdminDashboardSections/ManagerHourlyUnassignedProjectTable";
import axios from "../utils/axios"
import ManagerFormsMenu from "./ManagerFormsMenu";
import SubmittedProjectsTable from "./AdminDashboardSections/SubmittedProjectsTable";
import UserSubmittedProjectsTable from "./AdminDashboardSections/UserSubmittedProjectsTable";

interface Project {
  _id: string;
  project_id: string;
  project_name: string;
  profile_name: string;
  sheet_name: string;
  fixed_option?: string;
  created_at?: string;
  deadline?: string;
  shift?: string;
  assigned_to?: string;
}

export default function ManagerDashboard() {
  const [activeSection, setActiveSection] = useState("dashboard");
  const [assignedProjects, setAssignedProjects] = useState<Project[]>([]);
  const [unassignedProjects, setUnassignedProjects] = useState<Project[]>([]);

  const refreshAllTables = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const [assignedRes, unassignedRes] = await Promise.all([
        axios.get("/manager/get-assigned-projects", { headers: { Authorization: `Bearer ${token}` } }),
        axios.get("/manager/get-unassigned-projects", { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      setAssignedProjects(assignedRes.data.projects || []);
      setUnassignedProjects(unassignedRes.data.projects || []);
    } catch (err) {
      console.error("Error fetching projects:", err);
      setAssignedProjects([]);
      setUnassignedProjects([]);
    }
  };

  useEffect(() => {
    refreshAllTables();
  }, []);

  const renderSection = () => {
    switch (activeSection) {
      case "dashboard":
        return (
          <div>
            <div className="p-6 text-3xl font-bold text-purple-800">Welcome Manager 👨‍💼</div>

            {/* 🔹 USER SUBMITTED / ASSIGNED PROJECTS (same as User Dashboard) */}
            <div className="mb-8">
              <UserSubmittedProjectsTable />
            </div>

            <div className="mb-8">
              {/* 1. Assigned Projects */}
              <ManagerAssignedProjectsTable projects={assignedProjects} refresh={refreshAllTables} />

              {/* 2. Unassigned Projects */}
              <div className="mt-8">
                <ManagerUnassignedProjectsTable projects={unassignedProjects} refresh={refreshAllTables} />
              </div>

              {/* 3. Hourly Assigned Projects */}
              <div className="mt-8">
                <ManagerHourlyAssignedProjectTable />
              </div>

              {/* HOURLY — Unassigned */}
              <div className="mt-8">
                <ManagerHourlyUnassignedProjectsTable />
              </div>

            </div>
          </div>
        );
      case "add-project": // now show the forms menu
        return <ManagerFormsMenu />;
      case "submitted-projects":
        return <SubmittedProjectsTable />;
      default:
        return <div className="p-4 text-xl">Welcome, Manager!</div>;
    }
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar activeSection={activeSection} setActiveSection={setActiveSection} hideUsers hideUnpricedProjects />
      <div className="flex-1 p-6 bg-gray-50 overflow-x-hidden overflow-y-auto">{renderSection()}</div>
    </div>
  );
}

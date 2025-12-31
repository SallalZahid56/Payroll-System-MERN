import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import ManagerAssignedProjectsTable from "./AdminDashboardSections/ManagerAssignedProjectsTable";
import ManagerUnassignedProjectsTable from "./AdminDashboardSections/ManagerUnassignedProjectsTable";
import ProfileHourlyAssignedProjectsTable from "./AdminDashboardSections/ProfileHourlyAssignedProjectsTable";
import ProfileHourlyUnassignedProjectsTable from "./AdminDashboardSections/ProfileHourlyUnassignedProjectsTable";
import axios from "../utils/axios"
import ManagerFormsMenu from "./ManagerFormsMenu";
import TopBar from "../components/TopBar";

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

export default function ProfileDashboard() {
    const [activeSection, setActiveSection] = useState("dashboard");
    const [assignedProjects, setAssignedProjects] = useState<Project[]>([]);
    const [unassignedProjects, setUnassignedProjects] = useState<Project[]>([]);
    const [hourlyAssignedProjects, setHourlyAssignedProjects] = useState<Project[]>([]);
    const [hourlyUnassignedProjects, setHourlyUnassignedProjects] = useState<Project[]>([]);


    const refreshAllTables = async () => {
        try {
            const token = localStorage.getItem("token");
            if (!token) return;

            const [assignedRes, unassignedRes, hourlyAssignedRes, hourlyUnassignedRes] = await Promise.all([
                axios.get("/profile/get-assigned-projects", { headers: { Authorization: `Bearer ${token}` } }),
                axios.get("/profile/get-unassigned-projects", { headers: { Authorization: `Bearer ${token}` } }),
                axios.get("/profile/get-hourly-assigned-projects", { headers: { Authorization: `Bearer ${token}` } }),
                axios.get("/profile/get-hourly-unassigned-projects", { headers: { Authorization: `Bearer ${token}` } }),
            ]);

            setAssignedProjects(assignedRes.data.projects || []);
            setUnassignedProjects(unassignedRes.data.projects || []);

            // If you want separate state for hourly projects, define them:
            setHourlyAssignedProjects(hourlyAssignedRes.data.projects || []);
            setHourlyUnassignedProjects(hourlyUnassignedRes.data.projects || []);

        } catch (err) {
            console.error("Error fetching projects:", err);
            setAssignedProjects([]);
            setUnassignedProjects([]);
            setHourlyAssignedProjects([]);
            setHourlyUnassignedProjects([]);
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
                        <div className="p-6 text-3xl font-bold text-purple-800">Welcome To Profile Dashboard 👨‍💼</div>

                        <div className="mb-8">
                            {/* 1. Assigned Projects */}
                            <ManagerAssignedProjectsTable projects={assignedProjects} refresh={refreshAllTables} />

                            {/* 2. Unassigned Projects */}
                            <div className="mt-8">
                                <ManagerUnassignedProjectsTable projects={unassignedProjects} refresh={refreshAllTables} />
                            </div>

                            {/* 3. Hourly Assigned Projects */}
                            <div className="mt-8">
                                <ProfileHourlyAssignedProjectsTable projects={hourlyAssignedProjects} refresh={refreshAllTables} />
                            </div>

                            {/* HOURLY — Unassigned */}
                            <div className="mt-8">
                                <ProfileHourlyUnassignedProjectsTable projects={hourlyUnassignedProjects} refresh={refreshAllTables} />

                            </div>

                        </div>
                    </div>
                );
            case "add-project": // now show the forms menu
                return <ManagerFormsMenu />;
            default:
                return <div className="p-4 text-xl">Welcome, Manager!</div>;
        }
    };

    return (
        <div className="flex min-h-screen">
            <Sidebar activeSection={activeSection} setActiveSection={setActiveSection} hideUsers hideUnpricedProjects />
            <div className="flex-1 flex flex-col bg-gray-50">
                <TopBar />
                <div className="flex-1 p-6 overflow-x-hidden overflow-y-auto">
                    {renderSection()}
                </div>
            </div>
        </div>
    );
}

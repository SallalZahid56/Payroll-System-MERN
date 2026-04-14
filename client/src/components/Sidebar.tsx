import {
  LayoutDashboard,
  FolderKanban,
  PlusSquare,
  Users,
  WalletCards,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Trash,
  DollarSign,
} from "lucide-react";

interface SidebarProps {
  setActiveSection: (section: string) => void;
  activeSection?: string;
  hideUsers?: boolean;
  hideUnpricedProjects?: boolean;
  collapsed?: boolean;
  setCollapsed?: (value: boolean) => void; // Add this to control from parent
  showDeleteProject?: boolean; // whether to show the 'Delete a Project' item
  showProjectExpense?: boolean; // whether to show the 'Project Expense' item
}

interface MenuButtonItem {
  id: string;
  label: string;
  icon: React.ElementType;
}

export default function Sidebar({
  setActiveSection,
  activeSection,
  hideUsers,
  hideUnpricedProjects,
  collapsed = false,
  setCollapsed,
  showDeleteProject = false,
  showProjectExpense = false,
}: SidebarProps) {
  return (
    <aside
      className={`bg-purple-900 text-white flex flex-col sticky top-0 h-screen overflow-y-auto transition-all duration-300 ${
        collapsed ? "w-20" : "w-64"
      }`}
    >
      {/* Header + Toggle */}
      <div
        className={`flex items-center justify-between p-6 font-bold text-lg border-b border-purple-700 transition-all ${
          collapsed ? "text-center p-4 justify-center" : ""
        }`}
      >
        <span>{collapsed ? "PS" : "Payroll System"}</span>
        {/* Toggle button */}
        {setCollapsed && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="ml-auto p-1 hover:bg-purple-800 rounded"
          >
            {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {[
          { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
          !hideUnpricedProjects && {
            id: "unpriced-projects",
            label: "Unpriced Projects",
            icon: FolderKanban,
          },
          { id: "add-project", label: "Add Project", icon: PlusSquare },
          !hideUsers && { id: "users", label: "Users", icon: Users },
          !hideUsers && { id: "payroll", label: "Payroll", icon: WalletCards },
          !hideUsers && {
            id: "completed-projects",
            label: "Completed Projects",
            icon: CheckCircle2,
          },
              !hideUsers && { id: "pending-revisions", label: "Pending Revisions", icon: ClipboardCheck },
          { id: "submitted-projects", label: "Submitted Projects", icon: ClipboardCheck },
          // Only show Delete a Project for dashboards that opt-in
          showDeleteProject && { id: "delete-projects", label: "Delete a Project", icon: Trash },
          // Only show Project Expense for dashboards that opt-in
          showProjectExpense && { id: "project-expense", label: "Project Expense", icon: DollarSign },
        ]
          .filter(Boolean)
          .map((item) => {
            const btn = item as MenuButtonItem;
            return (
              <button
                key={btn.id}
                onClick={() => setActiveSection(btn.id)}
                className={`flex items-center gap-3 w-full p-2 rounded transition-all ${
                  activeSection === btn.id ? "bg-purple-700" : "hover:bg-purple-700"
                }`}
              >
                <btn.icon size={20} />
                {!collapsed && <span>{btn.label}</span>}
              </button>
            );
          })}
      </nav>
    </aside>
  );
}

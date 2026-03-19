import { useState } from "react";
import type { User } from "../lib/api";
import {
  LayoutDashboard, Settings, FileText, Activity, Users, Bell,
  Stethoscope, ClipboardList, LogOut, Menu, X, Heart
} from "lucide-react";

interface LayoutProps {
  user: User;
  currentView: string;
  onViewChange: (view: string) => void;
  onLogout: () => void;
  children: React.ReactNode;
  notificationCount: number;
}

const NAV_ITEMS: Record<string, { label: string; icon: React.ReactNode; views: { id: string; label: string; icon: React.ReactNode }[] }> = {
  admin: {
    label: "Admin Panel",
    icon: <Settings className="w-5 h-5" />,
    views: [
      { id: "admin-rules", label: "Rules Engine", icon: <Settings className="w-4 h-4" /> },
      { id: "admin-audit", label: "Audit Logs", icon: <FileText className="w-4 h-4" /> },
      { id: "admin-health", label: "System Health", icon: <Activity className="w-4 h-4" /> },
      { id: "admin-users", label: "Users", icon: <Users className="w-4 h-4" /> },
    ],
  },
  manager: {
    label: "Operations",
    icon: <LayoutDashboard className="w-5 h-5" />,
    views: [
      { id: "manager-overview", label: "Overview", icon: <LayoutDashboard className="w-4 h-4" /> },
      { id: "manager-resources", label: "Resources", icon: <ClipboardList className="w-4 h-4" /> },
      { id: "manager-patients", label: "Patients", icon: <Users className="w-4 h-4" /> },
      { id: "manager-alerts", label: "Alerts", icon: <Bell className="w-4 h-4" /> },
    ],
  },
  clinician: {
    label: "Clinical View",
    icon: <Stethoscope className="w-5 h-5" />,
    views: [
      { id: "clinician-patients", label: "My Patients", icon: <Users className="w-4 h-4" /> },
      { id: "clinician-tasks", label: "Tasks", icon: <ClipboardList className="w-4 h-4" /> },
      { id: "clinician-notifications", label: "Notifications", icon: <Bell className="w-4 h-4" /> },
    ],
  },
};

export function Layout({ user, currentView, onViewChange, onLogout, children, notificationCount }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const nav = NAV_ITEMS[user.role];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? "w-64" : "w-0 overflow-hidden"} bg-slate-900 text-white transition-all duration-300 flex flex-col`}>
        <div className="p-4 border-b border-slate-700 flex items-center gap-2">
          <Heart className="w-6 h-6 text-red-400" />
          <div>
            <h1 className="font-bold text-sm">VitalTriage AI</h1>
            <p className="text-xs text-slate-400">{nav?.label}</p>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {nav?.views.map((v) => (
            <button
              key={v.id}
              onClick={() => onViewChange(v.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                currentView === v.id
                  ? "bg-blue-600 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              {v.icon}
              {v.label}
              {v.id.includes("notification") || v.id.includes("alert") ? (
                notificationCount > 0 ? (
                  <span className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{notificationCount}</span>
                ) : null
              ) : null}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-slate-700">
          <div className="flex items-center gap-2 px-3 py-2 text-sm text-slate-300">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center font-semibold text-xs">
              {user.full_name.split(" ").map((n) => n[0]).join("")}
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate font-medium">{user.full_name}</p>
              <p className="text-xs text-slate-400 capitalize">{user.role}</p>
            </div>
            <button onClick={onLogout} className="text-slate-400 hover:text-white" title="Logout">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 bg-white border-b flex items-center px-4 gap-4 shrink-0">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-gray-600 hover:text-gray-900">
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <h2 className="font-semibold text-gray-800">
            {nav?.views.find((v) => v.id === currentView)?.label || "Dashboard"}
          </h2>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-xs text-gray-500">
              {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </span>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}

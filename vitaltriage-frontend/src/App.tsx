import { useState, useEffect, useCallback } from "react";
import type { User } from "./lib/api";
import { api } from "./lib/api";
import { LoginPage } from "./components/LoginPage";
import { Layout } from "./components/Layout";
import { RulesEngine } from "./components/admin/RulesEngine";
import { AuditLogs } from "./components/admin/AuditLogs";
import { SystemHealth } from "./components/admin/SystemHealth";
import { UserManagement } from "./components/admin/UserManagement";
import { Overview } from "./components/manager/Overview";
import { ResourceTracker } from "./components/manager/ResourceTracker";
import { PatientTable } from "./components/manager/PatientTable";
import { AlertsPanel } from "./components/manager/AlertsPanel";
import { MyPatients } from "./components/clinician/MyPatients";
import { TaskBoard } from "./components/clinician/TaskBoard";
import { NotificationCenter } from "./components/clinician/NotificationCenter";

const DEFAULT_VIEWS: Record<string, string> = {
  admin: "admin-rules",
  manager: "manager-overview",
  clinician: "clinician-patients",
};

const DOCTOR_MAP: Record<string, string> = {
  drsmith: "Dr. Smith",
  drjones: "Dr. Jones",
  drpatel: "Dr. Patel",
  drmiller: "Dr. Miller",
  drwilson: "Dr. Wilson",
  drbrown: "Dr. Brown",
  drlee: "Dr. Lee",
};

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState("");
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    const saved = localStorage.getItem("vt_user");
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as User;
        setUser(parsed);
        setCurrentView(DEFAULT_VIEWS[parsed.role] || "");
      } catch {
        localStorage.removeItem("vt_user");
      }
    }
  }, []);

  useEffect(() => {
    if (user) {
      api.getNotifications({ user_id: String(user.id) }).then((d) => {
        setNotificationCount(d.notifications.filter((n) => !n.is_read).length);
      }).catch(() => {});
    }
  }, [user, currentView]);

  const handleLogin = useCallback((u: User) => {
    setUser(u);
    setCurrentView(DEFAULT_VIEWS[u.role] || "");
    localStorage.setItem("vt_user", JSON.stringify(u));
  }, []);

  const handleLogout = useCallback(() => {
    setUser(null);
    setCurrentView("");
    localStorage.removeItem("vt_user");
  }, []);

  if (!user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  const doctorName = DOCTOR_MAP[user.username] || user.full_name;

  const renderView = () => {
    switch (currentView) {
      case "admin-rules":
        return <RulesEngine />;
      case "admin-audit":
        return <AuditLogs />;
      case "admin-health":
        return <SystemHealth />;
      case "admin-users":
        return <UserManagement />;
      case "manager-overview":
        return <Overview />;
      case "manager-resources":
        return <ResourceTracker />;
      case "manager-patients":
        return <PatientTable />;
      case "manager-alerts":
        return <AlertsPanel />;
      case "clinician-patients":
        return <MyPatients doctorName={doctorName} />;
      case "clinician-tasks":
        return <TaskBoard userId={user.id} />;
      case "clinician-notifications":
        return (
          <NotificationCenter
            userId={user.id}
            onUnreadChange={setNotificationCount}
          />
        );
      default:
        return <div className="text-gray-400 text-center py-12">Select a view from the sidebar</div>;
    }
  };

  return (
    <Layout
      user={user}
      currentView={currentView}
      onViewChange={setCurrentView}
      onLogout={handleLogout}
      notificationCount={notificationCount}
    >
      {renderView()}
    </Layout>
  );
}

export default App

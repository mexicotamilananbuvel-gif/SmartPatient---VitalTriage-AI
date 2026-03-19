import { useState, useEffect } from "react";
import { api } from "../../lib/api";
import type { Notification } from "../../lib/api";
import { PriorityBadge } from "../PriorityBadge";
import { Bell, CheckCheck, Clock } from "lucide-react";

export function AlertsPanel() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState("");

  const loadNotifications = async () => {
    const params: Record<string, string> = {};
    if (filter) params.severity = filter;
    const data = await api.getNotifications(params);
    setNotifications(data.notifications);
  };

  useEffect(() => { loadNotifications(); }, [filter]);

  const handleMarkRead = async (id: number) => {
    await api.markRead(id);
    loadNotifications();
  };

  const handleMarkAllRead = async () => {
    await api.markAllRead();
    loadNotifications();
  };

  const unread = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Alerts & Notifications</h3>
          <p className="text-sm text-gray-500">{unread} unread alerts</p>
        </div>
        <div className="flex gap-2">
          <select value={filter} onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm">
            <option value="">All Severity</option>
            <option value="critical">Critical</option>
            <option value="warning">Warning</option>
            <option value="info">Info</option>
          </select>
          {unread > 0 && (
            <button onClick={handleMarkAllRead}
              className="flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-100 text-sm font-medium">
              <CheckCheck className="w-4 h-4" /> Mark All Read
            </button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {notifications.map((n) => (
          <div key={n.id}
            className={`bg-white rounded-xl border p-4 flex items-start gap-4 transition-colors ${
              !n.is_read ? "border-l-4 border-l-blue-500" : "opacity-70"
            }`}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
              n.severity === "critical" ? "bg-red-100 text-red-600" :
              n.severity === "warning" ? "bg-amber-100 text-amber-600" :
              "bg-blue-100 text-blue-600"
            }`}>
              <Bell className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <PriorityBadge priority={n.severity} size="sm" />
                {n.patient_id && (
                  <span className="text-xs font-mono text-gray-500">Patient: {n.patient_id}</span>
                )}
              </div>
              <p className="text-sm text-gray-800">{n.message}</p>
              <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
                <Clock className="w-3 h-3" />
                {n.created_at}
              </div>
            </div>
            {!n.is_read && (
              <button onClick={() => handleMarkRead(n.id)}
                className="text-xs text-blue-600 hover:underline shrink-0">
                Mark read
              </button>
            )}
          </div>
        ))}
        {notifications.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No alerts found</p>
          </div>
        )}
      </div>
    </div>
  );
}

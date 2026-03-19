import { useState, useEffect } from "react";
import { api } from "../../lib/api";
import { KpiCard } from "../KpiCard";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from "recharts";
import { Users, Settings, Activity, Database } from "lucide-react";
import type { TrendEntry } from "../../lib/api";

export function SystemHealth() {
  const [patientCount, setPatientCount] = useState(0);
  const [activeRules, setActiveRules] = useState(0);
  const [activeUsers, setActiveUsers] = useState(0);
  const [trend, setTrend] = useState<TrendEntry[]>([]);
  const [utilization, setUtilization] = useState<{ resource_type: string; utilization_pct: number; total_capacity: number; currently_used: number }[]>([]);

  useEffect(() => {
    api.getPatientCount().then((d) => setPatientCount(d.count));
    api.getActiveRules().then((d) => setActiveRules(d.count));
    api.getActiveUsers().then((d) => setActiveUsers(d.count));
    api.getClassificationTrend().then((d) => setTrend(d.trend));
    api.getUtilization().then((d) => setUtilization(d.utilization));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-800">System Health & Metrics</h3>
        <p className="text-sm text-gray-500">Platform performance and usage statistics</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="Total Patients" value={patientCount} icon={<Users className="w-5 h-5" />} color="blue" />
        <KpiCard label="Active Rules" value={activeRules} icon={<Settings className="w-5 h-5" />} color="purple" />
        <KpiCard label="Active Users" value={activeUsers} icon={<Activity className="w-5 h-5" />} color="green" />
        <KpiCard label="DB Status" value="Online" icon={<Database className="w-5 h-5" />} color="teal" />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border p-6">
          <h4 className="font-semibold text-gray-800 mb-4">Classification Trend (7 Days)</h4>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="critical" stroke="#ef4444" strokeWidth={2} name="Critical" />
              <Line type="monotone" dataKey="moderate" stroke="#f59e0b" strokeWidth={2} name="Moderate" />
              <Line type="monotone" dataKey="stable" stroke="#22c55e" strokeWidth={2} name="Stable" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border p-6">
          <h4 className="font-semibold text-gray-800 mb-4">Resource Utilization (%)</h4>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={utilization}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="resource_type" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
              <Tooltip />
              <Bar dataKey="utilization_pct" fill="#3b82f6" name="Utilization %" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

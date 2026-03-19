import { useState, useEffect } from "react";
import { api } from "../../lib/api";
import type { DashboardSummary, RegionStat } from "../../lib/api";
import { KpiCard } from "../KpiCard";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from "recharts";
import { Users, AlertTriangle, ShieldCheck, Bed, Heart, Activity } from "lucide-react";

const PIE_COLORS = ["#ef4444", "#f59e0b", "#22c55e"];

export function Overview() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [regionStats, setRegionStats] = useState<RegionStat[]>([]);

  useEffect(() => {
    api.getSummary().then(setSummary);
    api.getRegionStats().then((d) => setRegionStats(d.regions));
  }, []);

  if (!summary) return <div className="text-center py-8 text-gray-400">Loading...</div>;

  const pieData = [
    { name: "Critical", value: summary.critical },
    { name: "Moderate", value: summary.moderate },
    { name: "Stable", value: summary.stable },
  ];

  const bedUtilPct = summary.beds_total > 0 ? Math.round((summary.beds_used / summary.beds_total) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-800">Operations Overview</h3>
        <p className="text-sm text-gray-500">Real-time patient load and resource status as of {summary.record_date}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="Total Patients" value={summary.total_patients} icon={<Users className="w-5 h-5" />} color="blue" />
        <KpiCard label="Critical" value={summary.critical} icon={<AlertTriangle className="w-5 h-5" />} color="red" />
        <KpiCard label="Moderate" value={summary.moderate} icon={<Activity className="w-5 h-5" />} color="amber" />
        <KpiCard label="Stable" value={summary.stable} icon={<ShieldCheck className="w-5 h-5" />} color="green" />
        <KpiCard label="ICU Occupied" value={summary.icu_occupied} icon={<Heart className="w-5 h-5" />} color="purple" />
        <KpiCard label="Beds Available" value={summary.beds_available} icon={<Bed className="w-5 h-5" />} color="teal" subtitle={`${bedUtilPct}% utilized`} />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border p-6">
          <h4 className="font-semibold text-gray-800 mb-4">Patient Severity Distribution</h4>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" outerRadius={100} innerRadius={50} paddingAngle={4} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border p-6">
          <h4 className="font-semibold text-gray-800 mb-4">Patients by Region</h4>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={regionStats}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="region" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="critical" fill="#ef4444" name="Critical" stackId="a" />
              <Bar dataKey="moderate" fill="#f59e0b" name="Moderate" stackId="a" />
              <Bar dataKey="stable" fill="#22c55e" name="Stable" stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bed Capacity Bar */}
      <div className="bg-white rounded-xl border p-6">
        <h4 className="font-semibold text-gray-800 mb-4">Bed Capacity Overview</h4>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Bed Utilization</span>
              <span className="font-semibold">{summary.beds_used} / {summary.beds_total}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div
                className={`h-4 rounded-full transition-all ${bedUtilPct > 85 ? "bg-red-500" : bedUtilPct > 60 ? "bg-amber-500" : "bg-green-500"}`}
                style={{ width: `${bedUtilPct}%` }}
              />
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-gray-800">{bedUtilPct}%</p>
            <p className="text-xs text-gray-500">{summary.beds_available} beds free</p>
          </div>
        </div>
      </div>
    </div>
  );
}

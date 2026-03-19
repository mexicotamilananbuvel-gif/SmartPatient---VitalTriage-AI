import { useState, useEffect } from "react";
import { api } from "../../lib/api";
import type { Resource, ResourceUtilization } from "../../lib/api";
import { PriorityBadge } from "../PriorityBadge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export function ResourceTracker() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [utilization, setUtilization] = useState<ResourceUtilization[]>([]);
  const [filter, setFilter] = useState({ type: "", branch: "" });
  const [branches, setBranches] = useState<string[]>([]);

  useEffect(() => {
    api.getBranches().then((d) => setBranches(d.branches));
    loadData();
  }, []);

  useEffect(() => { loadData(); }, [filter]);

  const loadData = async () => {
    const params: Record<string, string> = {};
    if (filter.type) params.resource_type = filter.type;
    if (filter.branch) params.hospital_branch = filter.branch;
    api.getResources(params).then((d) => setResources(d.resources));
    api.getUtilization().then((d) => setUtilization(d.utilization));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Resource Allocation</h3>
          <p className="text-sm text-gray-500">Beds, staff, and equipment utilization tracking</p>
        </div>
        <div className="flex gap-2">
          <select value={filter.type} onChange={(e) => setFilter({ ...filter, type: e.target.value })}
            className="px-3 py-2 border rounded-lg text-sm">
            <option value="">All Types</option>
            <option value="bed">Beds</option>
            <option value="staff">Staff</option>
            <option value="equipment">Equipment</option>
          </select>
          <select value={filter.branch} onChange={(e) => setFilter({ ...filter, branch: e.target.value })}
            className="px-3 py-2 border rounded-lg text-sm">
            <option value="">All Branches</option>
            {branches.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
      </div>

      {/* Utilization Chart */}
      <div className="bg-white rounded-xl border p-6">
        <h4 className="font-semibold text-gray-800 mb-4">Utilization by Category</h4>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={utilization} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} />
            <YAxis type="category" dataKey="resource_type" tick={{ fontSize: 12 }} width={80} />
            <Tooltip formatter={(val: number) => `${val.toFixed(1)}%`} />
            <Bar dataKey="utilization_pct" fill="#3b82f6" name="Utilization %" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Resources Table */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Resource</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Type</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Branch</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Capacity</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Usage</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {resources.map((r) => {
              const pct = r.total_capacity > 0 ? Math.round((r.currently_used / r.total_capacity) * 100) : 0;
              return (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-800">{r.resource_name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 capitalize">{r.resource_type}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{r.hospital_branch}</td>
                  <td className="px-4 py-3 text-sm text-gray-700 font-mono">{r.currently_used}/{r.total_capacity}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${pct > 85 ? "bg-red-500" : pct > 60 ? "bg-amber-500" : "bg-green-500"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">{pct}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3"><PriorityBadge priority={r.status} size="sm" /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

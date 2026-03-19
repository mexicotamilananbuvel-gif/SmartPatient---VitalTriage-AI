import { useState, useEffect } from "react";
import { api } from "../../lib/api";
import type { AuditLog } from "../../lib/api";
import { PriorityBadge } from "../PriorityBadge";

export function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    const params: Record<string, string> = {};
    if (filter) params.action = filter;
    api.getAuditLogs(params).then((d) => setLogs(d.audit_logs));
  }, [filter]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Audit Trail</h3>
          <p className="text-sm text-gray-500">System activity and change history</p>
        </div>
        <select value={filter} onChange={(e) => setFilter(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm">
          <option value="">All Actions</option>
          <option value="CREATE">Create</option>
          <option value="UPDATE">Update</option>
          <option value="DELETE">Delete</option>
          <option value="TOGGLE">Toggle</option>
          <option value="VIEW">View</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Timestamp</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">User</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Action</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Entity</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-xs text-gray-500 font-mono">{log.timestamp}</td>
                <td className="px-4 py-3">
                  <p className="text-sm font-medium text-gray-800">{log.user_name}</p>
                  <p className="text-xs text-gray-500 capitalize">{log.user_role}</p>
                </td>
                <td className="px-4 py-3"><PriorityBadge priority={log.action} size="sm" /></td>
                <td className="px-4 py-3 text-sm text-gray-700">{log.entity_type}</td>
                <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">{log.details}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {logs.length === 0 && (
          <div className="text-center py-8 text-gray-400 text-sm">No audit logs found</div>
        )}
      </div>
    </div>
  );
}

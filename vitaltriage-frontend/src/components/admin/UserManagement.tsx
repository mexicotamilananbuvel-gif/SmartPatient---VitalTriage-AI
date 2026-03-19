import { useState, useEffect } from "react";
import { api } from "../../lib/api";
import type { User } from "../../lib/api";
import { PriorityBadge } from "../PriorityBadge";

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    const userPromises = Array.from({ length: 9 }, (_, i) =>
      api.getMe(i + 1).catch(() => null)
    );
    const results = await Promise.all(userPromises);
    setUsers(results.filter((u): u is User => u !== null));
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-800">User Management</h3>
        <p className="text-sm text-gray-500">View and manage platform users</p>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">ID</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Username</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Email</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Role</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-mono text-gray-600">#{user.id}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-semibold">
                      {user.full_name.split(" ").map((n) => n[0]).join("")}
                    </div>
                    <span className="text-sm font-medium text-gray-800">{user.full_name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 font-mono">{user.username}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{user.email}</td>
                <td className="px-4 py-3">
                  <PriorityBadge priority={user.role} size="sm" />
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1 text-xs font-medium ${user.is_active ? "text-green-600" : "text-gray-400"}`}>
                    <span className={`w-2 h-2 rounded-full ${user.is_active ? "bg-green-500" : "bg-gray-300"}`} />
                    {user.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

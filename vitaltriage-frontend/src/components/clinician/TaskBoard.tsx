import { useState, useEffect } from "react";
import { api } from "../../lib/api";
import type { Task } from "../../lib/api";
import { PriorityBadge } from "../PriorityBadge";
import { Plus, Clock, CheckCircle, Circle, ArrowRight } from "lucide-react";

interface TaskBoardProps {
  userId: number;
}

export function TaskBoard({ userId }: TaskBoardProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<{ patient_id: string; title: string; description: string; priority: "low" | "medium" | "high" | "urgent"; due_date: string }>({ patient_id: "", title: "", description: "", priority: "medium", due_date: "" });

  const loadTasks = async () => {
    const data = await api.getTasks({ assigned_to: String(userId) });
    setTasks(data.tasks);
  };

  useEffect(() => { loadTasks(); }, [userId]);

  const handleCreate = async () => {
    await api.createTask({ ...form, assigned_to: userId });
    setShowForm(false);
    setForm({ patient_id: "", title: "", description: "", priority: "medium", due_date: "" });
    loadTasks();
  };

  const handleStatusChange = async (taskId: number, newStatus: string) => {
    await api.updateTaskStatus(taskId, newStatus);
    loadTasks();
  };

  const columns: { key: Task["status"]; label: string; icon: React.ReactNode; color: string }[] = [
    { key: "pending", label: "To Do", icon: <Circle className="w-4 h-4" />, color: "border-gray-300" },
    { key: "in_progress", label: "In Progress", icon: <ArrowRight className="w-4 h-4" />, color: "border-blue-400" },
    { key: "completed", label: "Done", icon: <CheckCircle className="w-4 h-4" />, color: "border-green-400" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Task Board</h3>
          <p className="text-sm text-gray-500">{tasks.length} tasks assigned</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium">
          <Plus className="w-4 h-4" /> New Task
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border p-6 shadow-sm">
          <h4 className="font-semibold mb-4">Create Task</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Task title" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Patient ID</label>
              <input value={form.patient_id} onChange={(e) => setForm({ ...form, patient_id: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="e.g. P001" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm" rows={2} placeholder="Task description" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as "low" | "medium" | "high" | "urgent" })}
                className="w-full px-3 py-2 border rounded-lg text-sm">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
              <input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={handleCreate} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium">Create</button>
            <button onClick={() => setShowForm(false)} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 text-sm">Cancel</button>
          </div>
        </div>
      )}

      {/* Kanban Board */}
      <div className="grid grid-cols-3 gap-4">
        {columns.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.key);
          return (
            <div key={col.key} className={`bg-gray-50 rounded-xl border-t-4 ${col.color} p-4`}>
              <div className="flex items-center gap-2 mb-4">
                {col.icon}
                <h4 className="font-semibold text-gray-700 text-sm">{col.label}</h4>
                <span className="ml-auto bg-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded-full">{colTasks.length}</span>
              </div>
              <div className="space-y-3">
                {colTasks.map((task) => (
                  <div key={task.id} className="bg-white rounded-lg border p-3 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <PriorityBadge priority={task.priority} size="sm" />
                      <span className="text-xs font-mono text-gray-400">{task.patient_id}</span>
                    </div>
                    <p className="text-sm font-medium text-gray-800 mb-1">{task.title}</p>
                    {task.description && <p className="text-xs text-gray-500 mb-2">{task.description}</p>}
                    <div className="flex items-center justify-between">
                      {task.due_date && (
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {task.due_date}
                        </span>
                      )}
                      <div className="flex gap-1 ml-auto">
                        {col.key !== "completed" && (
                          <button
                            onClick={() => handleStatusChange(task.id, col.key === "pending" ? "in_progress" : "completed")}
                            className="text-xs text-blue-600 hover:underline"
                          >
                            {col.key === "pending" ? "Start" : "Complete"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {colTasks.length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-4">No tasks</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

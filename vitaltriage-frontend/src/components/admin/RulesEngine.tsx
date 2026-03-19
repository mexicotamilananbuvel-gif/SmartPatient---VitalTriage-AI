import { useState, useEffect } from "react";
import { api } from "../../lib/api";
import type { ClassificationRule } from "../../lib/api";
import { PriorityBadge } from "../PriorityBadge";
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight } from "lucide-react";

export function RulesEngine() {
  const [rules, setRules] = useState<ClassificationRule[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editRule, setEditRule] = useState<ClassificationRule | null>(null);
  const [form, setForm] = useState({
    rule_name: "",
    description: "",
    field: "Severity_Score",
    operator: ">=",
    threshold_value: 0,
    target_severity: "Critical",
    priority_order: 0,
  });

  const loadRules = async () => {
    const data = await api.getRules();
    setRules(data.rules);
  };

  useEffect(() => { loadRules(); }, []);

  const handleSubmit = async () => {
    if (editRule) {
      await api.updateRule(editRule.id, form);
    } else {
      await api.createRule(form);
    }
    setShowForm(false);
    setEditRule(null);
    setForm({ rule_name: "", description: "", field: "Severity_Score", operator: ">=", threshold_value: 0, target_severity: "Critical", priority_order: 0 });
    loadRules();
  };

  const handleEdit = (rule: ClassificationRule) => {
    setEditRule(rule);
    setForm({
      rule_name: rule.rule_name,
      description: rule.description || "",
      field: rule.field,
      operator: rule.operator,
      threshold_value: rule.threshold_value,
      target_severity: rule.target_severity,
      priority_order: rule.priority_order,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm("Delete this rule?")) {
      await api.deleteRule(id);
      loadRules();
    }
  };

  const handleToggle = async (id: number) => {
    await api.toggleRule(id);
    loadRules();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Classification Rules</h3>
          <p className="text-sm text-gray-500">Manage patient triage classification rules and thresholds</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditRule(null); setForm({ rule_name: "", description: "", field: "Severity_Score", operator: ">=", threshold_value: 0, target_severity: "Critical", priority_order: 0 }); }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> Add Rule
        </button>
      </div>

      {/* Form Dialog */}
      {showForm && (
        <div className="bg-white rounded-xl border p-6 shadow-sm">
          <h4 className="font-semibold mb-4">{editRule ? "Edit Rule" : "New Classification Rule"}</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rule Name</label>
              <input value={form.rule_name} onChange={(e) => setForm({ ...form, rule_name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Rule name" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Description" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Patient Field</label>
              <select value={form.field} onChange={(e) => setForm({ ...form, field: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm">
                <option value="Severity_Score">Severity Score</option>
                <option value="Treatment_Urgency">Treatment Urgency</option>
                <option value="Vital_Risk_Score">Vital Risk Score</option>
                <option value="ICU_Required">ICU Required</option>
                <option value="Comorbidity_Count">Comorbidity Count</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Operator</label>
              <select value={form.operator} onChange={(e) => setForm({ ...form, operator: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm">
                {[">=", "<=", "==", ">", "<", "!="].map((op) => <option key={op} value={op}>{op}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Threshold Value</label>
              <input type="number" value={form.threshold_value} onChange={(e) => setForm({ ...form, threshold_value: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Target Severity</label>
              <select value={form.target_severity} onChange={(e) => setForm({ ...form, target_severity: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm">
                <option value="Critical">Critical</option>
                <option value="Moderate">Moderate</option>
                <option value="Stable">Stable</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority Order</label>
              <input type="number" value={form.priority_order} onChange={(e) => setForm({ ...form, priority_order: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={handleSubmit} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium">
              {editRule ? "Update" : "Create"} Rule
            </button>
            <button onClick={() => { setShowForm(false); setEditRule(null); }} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 text-sm">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Rules Table */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Priority</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Rule Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Condition</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Target</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rules.map((rule) => (
              <tr key={rule.id} className={`hover:bg-gray-50 ${!rule.is_active ? "opacity-50" : ""}`}>
                <td className="px-4 py-3 text-sm font-mono text-gray-600">#{rule.priority_order}</td>
                <td className="px-4 py-3">
                  <p className="text-sm font-medium text-gray-800">{rule.rule_name}</p>
                  <p className="text-xs text-gray-500">{rule.description}</p>
                </td>
                <td className="px-4 py-3 text-sm font-mono text-gray-700">
                  {rule.field} {rule.operator} {rule.threshold_value}
                </td>
                <td className="px-4 py-3"><PriorityBadge priority={rule.target_severity} /></td>
                <td className="px-4 py-3">
                  <button onClick={() => handleToggle(rule.id)} className="text-gray-500 hover:text-blue-600">
                    {rule.is_active ? <ToggleRight className="w-6 h-6 text-green-500" /> : <ToggleLeft className="w-6 h-6 text-gray-400" />}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => handleEdit(rule)} className="text-gray-400 hover:text-blue-600"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(rule.id)} className="text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

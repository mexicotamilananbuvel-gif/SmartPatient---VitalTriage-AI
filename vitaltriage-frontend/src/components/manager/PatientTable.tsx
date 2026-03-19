import { useState, useEffect } from "react";
import { api } from "../../lib/api";
import type { Patient } from "../../lib/api";
import { PriorityBadge } from "../PriorityBadge";
import { Search, Download, ChevronDown, ChevronUp, Eye } from "lucide-react";

interface PatientTableProps {
  onSelectPatient?: (patient: Patient) => void;
}

export function PatientTable({ onSelectPatient }: PatientTableProps) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [filters, setFilters] = useState({ priority: "", region: "", branch: "", search: "" });
  const [regions, setRegions] = useState<string[]>([]);
  const [branches, setBranches] = useState<string[]>([]);
  const [sortField, setSortField] = useState<keyof Patient>("severity_score");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [history, setHistory] = useState<Patient[]>([]);

  useEffect(() => {
    api.getRegions().then((d) => setRegions(d.regions));
    api.getBranches().then((d) => setBranches(d.branches));
    loadPatients();
  }, []);

  useEffect(() => { loadPatients(); }, [filters]);

  const loadPatients = async () => {
    const params: Record<string, string> = {};
    if (filters.priority) params.priority_group = filters.priority;
    if (filters.region) params.region = filters.region;
    if (filters.branch) params.hospital_branch = filters.branch;
    const data = await api.getLatestPatients(params);
    setPatients(data.patients);
  };

  const handleSort = (field: keyof Patient) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const sorted = [...patients]
    .filter((p) => {
      if (!filters.search) return true;
      const s = filters.search.toLowerCase();
      return p.patient_id.toLowerCase().includes(s) ||
        p.primary_condition.toLowerCase().includes(s) ||
        p.doctor_assigned.toLowerCase().includes(s);
    })
    .sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      }
      return sortDir === "asc"
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });

  const handleExpand = async (patientId: string) => {
    if (expandedId === patientId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(patientId);
    const data = await api.getPatientHistory(patientId);
    setHistory(data.history);
  };

  const handleExport = () => {
    window.open(`${import.meta.env.VITE_API_URL || "http://localhost:8000"}/api/patients/export/data?format=csv`, "_blank");
  };

  const SortIcon = ({ field }: { field: keyof Patient }) => {
    if (sortField !== field) return null;
    return sortDir === "asc" ? <ChevronUp className="w-3 h-3 inline" /> : <ChevronDown className="w-3 h-3 inline" />;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Patient Registry</h3>
          <p className="text-sm text-gray-500">{sorted.length} patients found</p>
        </div>
        <button onClick={handleExport} className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 text-sm">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
          <input value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm" placeholder="Search patient ID, condition, doctor..." />
        </div>
        <select value={filters.priority} onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
          className="px-3 py-2 border rounded-lg text-sm">
          <option value="">All Severity</option>
          <option value="Critical">Critical</option>
          <option value="Moderate">Moderate</option>
          <option value="Stable">Stable</option>
        </select>
        <select value={filters.region} onChange={(e) => setFilters({ ...filters, region: e.target.value })}
          className="px-3 py-2 border rounded-lg text-sm">
          <option value="">All Regions</option>
          {regions.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <select value={filters.branch} onChange={(e) => setFilters({ ...filters, branch: e.target.value })}
          className="px-3 py-2 border rounded-lg text-sm">
          <option value="">All Branches</option>
          {branches.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase cursor-pointer hover:text-gray-700" onClick={() => handleSort("patient_id")}>
                ID <SortIcon field="patient_id" />
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Condition</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase cursor-pointer hover:text-gray-700" onClick={() => handleSort("severity_score")}>
                Severity <SortIcon field="severity_score" />
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Priority</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Doctor</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Region</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase">ICU</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Risk</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {sorted.map((p) => (
              <>
                <tr key={p.patient_id} className="hover:bg-gray-50">
                  <td className="px-3 py-3 text-sm font-mono font-semibold text-blue-600">{p.patient_id}</td>
                  <td className="px-3 py-3 text-sm text-gray-800">{p.primary_condition}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                        style={{ backgroundColor: p.severity_score >= 8 ? "#ef4444" : p.severity_score >= 5 ? "#f59e0b" : "#22c55e" }}>
                        {p.severity_score}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3"><PriorityBadge priority={p.priority_group} size="sm" /></td>
                  <td className="px-3 py-3 text-sm text-gray-600">{p.doctor_assigned}</td>
                  <td className="px-3 py-3 text-sm text-gray-600">{p.region}</td>
                  <td className="px-3 py-3"><PriorityBadge priority={p.icu_required} size="sm" /></td>
                  <td className="px-3 py-3 text-sm text-gray-600">{p.readmission_risk}</td>
                  <td className="px-3 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => handleExpand(p.patient_id)} className="text-gray-400 hover:text-blue-600 p-1" title="View history">
                        <Eye className="w-4 h-4" />
                      </button>
                      {onSelectPatient && (
                        <button onClick={() => onSelectPatient(p)} className="text-xs text-blue-600 hover:underline">Detail</button>
                      )}
                    </div>
                  </td>
                </tr>
                {expandedId === p.patient_id && (
                  <tr key={`${p.patient_id}-history`}>
                    <td colSpan={9} className="bg-blue-50 px-6 py-4">
                      <p className="text-sm font-semibold text-gray-700 mb-2">Patient History ({history.length} records)</p>
                      <div className="grid grid-cols-7 gap-2">
                        {history.map((h) => (
                          <div key={h.id} className="bg-white rounded-lg p-2 text-xs border">
                            <p className="font-semibold">{h.record_date}</p>
                            <p>Severity: <span className="font-bold">{h.severity_score}</span></p>
                            <p>Risk: {h.vital_risk_score}</p>
                            <PriorityBadge priority={h.priority_group} size="sm" />
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

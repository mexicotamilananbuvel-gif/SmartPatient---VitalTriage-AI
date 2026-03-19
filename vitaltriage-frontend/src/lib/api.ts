const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Request failed");
  }
  return res.json();
}

export const api = {
  // Auth
  login: (username: string, password: string) =>
    request<{ user: User; token: string }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),
  getMe: (userId: number) => request<User>(`/api/auth/me?user_id=${userId}`),

  // Dashboard
  getSummary: () => request<DashboardSummary>("/api/dashboard/summary"),
  getHeatmap: () => request<{ heatmap: HeatmapEntry[] }>("/api/dashboard/heatmap"),
  getRegionStats: () => request<{ regions: RegionStat[] }>("/api/dashboard/region-stats"),

  // Patients
  getLatestPatients: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return request<{ record_date: string; patients: Patient[] }>(`/api/patients/latest${qs}`);
  },
  getAssignedPatients: (doctor: string) =>
    request<{ patients: Patient[] }>(`/api/patients/assigned?doctor=${encodeURIComponent(doctor)}`),
  getPatient: (id: string) => request<Patient>(`/api/patients/${id}`),
  getPatientHistory: (id: string) =>
    request<{ patient_id: string; history: Patient[] }>(`/api/patients/${id}/history`),

  // Rules
  getRules: () => request<{ rules: ClassificationRule[] }>("/api/rules"),
  createRule: (rule: Omit<ClassificationRule, "id" | "is_active" | "created_at" | "updated_at" | "created_by">) =>
    request<ClassificationRule>("/api/rules", { method: "POST", body: JSON.stringify(rule) }),
  updateRule: (id: number, rule: Partial<ClassificationRule>) =>
    request<ClassificationRule>(`/api/rules/${id}`, { method: "PUT", body: JSON.stringify(rule) }),
  deleteRule: (id: number) => request<{ message: string }>(`/api/rules/${id}`, { method: "DELETE" }),
  toggleRule: (id: number) => request<ClassificationRule>(`/api/rules/${id}/toggle`, { method: "PATCH" }),

  // Resources
  getResources: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return request<{ resources: Resource[] }>(`/api/resources${qs}`);
  },
  getUtilization: () => request<{ utilization: ResourceUtilization[] }>("/api/resources/utilization"),

  // Triage
  classify: (input: TriageInput) =>
    request<TriageResult>("/api/triage/classify", { method: "POST", body: JSON.stringify(input) }),

  // Tasks
  getTasks: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return request<{ tasks: Task[] }>(`/api/tasks${qs}`);
  },
  createTask: (task: Partial<Task>) =>
    request<Task>("/api/tasks", { method: "POST", body: JSON.stringify(task) }),
  updateTaskStatus: (id: number, status: string) =>
    request<Task>(`/api/tasks/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),

  // Notifications
  getNotifications: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return request<{ notifications: Notification[] }>(`/api/notifications${qs}`);
  },
  markRead: (id: number) =>
    request<Notification>(`/api/notifications/${id}/read`, { method: "PATCH" }),
  markAllRead: () =>
    request<{ message: string }>("/api/notifications/read-all", { method: "PATCH" }),

  // Audit Logs
  getAuditLogs: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return request<{ audit_logs: AuditLog[] }>(`/api/audit-logs${qs}`);
  },

  // Stats
  getPatientCount: () => request<{ count: number }>("/api/stats/patients/count"),
  getActiveRules: () => request<{ count: number }>("/api/stats/rules/active"),
  getActiveUsers: () => request<{ count: number }>("/api/stats/users/active"),
  getClassificationTrend: () => request<{ trend: TrendEntry[] }>("/api/stats/classification-trend"),

  // Filters
  getRegions: () => request<{ regions: string[] }>("/api/filters/regions"),
  getBranches: () => request<{ branches: string[] }>("/api/filters/branches"),
  getDoctors: () => request<{ doctors: string[] }>("/api/filters/doctors"),
};

// Types
export interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role: "admin" | "manager" | "clinician";
  is_active: boolean;
}

export interface Patient {
  id: number;
  patient_id: string;
  record_date: string;
  age: number;
  gender: string;
  primary_condition: string;
  severity_score: number;
  treatment_urgency: number;
  vital_risk_score: number;
  comorbidity_count: number;
  recent_admissions_last_6m: number;
  medication_adherence: number;
  last_visit_days_ago: number;
  insurance_type: string;
  care_plan_assigned: string;
  doctor_assigned: string;
  follow_up_required: string;
  readmission_risk: string;
  region: string;
  hospital_branch: string;
  appointment_status: string;
  lab_test_pending: string;
  bed_required: string;
  icu_required: string;
  discharge_priority: string;
  priority_group: "Critical" | "Moderate" | "Stable";
}

export interface DashboardSummary {
  record_date: string;
  total_patients: number;
  critical: number;
  moderate: number;
  stable: number;
  icu_occupied: number;
  beds_needed: number;
  beds_total: number;
  beds_used: number;
  beds_available: number;
}

export interface HeatmapEntry {
  region: string;
  priority_group: string;
  count: number;
}

export interface RegionStat {
  region: string;
  critical: number;
  moderate: number;
  stable: number;
  total: number;
}

export interface ClassificationRule {
  id: number;
  rule_name: string;
  description: string | null;
  field: string;
  operator: string;
  threshold_value: number;
  target_severity: string;
  priority_order: number;
  is_active: boolean;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface Resource {
  id: number;
  resource_type: string;
  resource_name: string;
  hospital_branch: string;
  total_capacity: number;
  currently_used: number;
  status: string;
  updated_at: string;
}

export interface ResourceUtilization {
  resource_type: string;
  total_capacity: number;
  currently_used: number;
  utilization_pct: number;
  available: number;
}

export interface TriageInput {
  patient_id: string;
  severity_score: number;
  treatment_urgency: number;
  vital_risk_score: number;
  icu_required: string;
}

export interface TriageResult {
  patient_id: string;
  priority_group: string;
  matched_rule: string | null;
  reasoning: string;
}

export interface Task {
  id: number;
  patient_id: string;
  assigned_to: number | null;
  title: string;
  description: string | null;
  status: "pending" | "in_progress" | "completed";
  priority: "low" | "medium" | "high" | "urgent";
  due_date: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface Notification {
  id: number;
  user_id: number | null;
  patient_id: string | null;
  message: string;
  severity: "info" | "warning" | "critical";
  is_read: boolean;
  created_at: string;
}

export interface AuditLog {
  id: number;
  user_id: number;
  user_name: string;
  user_role: string;
  action: string;
  entity_type: string;
  entity_id: number | null;
  details: string;
  timestamp: string;
}

export interface TrendEntry {
  date: string;
  critical: number;
  moderate: number;
  stable: number;
}

from fastapi import FastAPI, Query, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import io
import csv

from app.database import get_db, init_db
from app.seed import run_seed

app = FastAPI(title="VitalTriage AI API")

# Disable CORS. Do not remove this for full-stack development.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)


@app.on_event("startup")
def startup():
    init_db()
    run_seed()


# --- Pydantic Models ---

class LoginRequest(BaseModel):
    username: str
    password: str


class RuleCreate(BaseModel):
    rule_name: str
    description: Optional[str] = None
    field: str
    operator: str
    threshold_value: float
    target_severity: str
    priority_order: int = 0


class RuleUpdate(BaseModel):
    rule_name: Optional[str] = None
    description: Optional[str] = None
    field: Optional[str] = None
    operator: Optional[str] = None
    threshold_value: Optional[float] = None
    target_severity: Optional[str] = None
    priority_order: Optional[int] = None


class ResourceCreate(BaseModel):
    resource_type: str
    resource_name: str
    hospital_branch: str
    total_capacity: int
    currently_used: int = 0
    status: str = "available"


class ResourceUpdate(BaseModel):
    resource_name: Optional[str] = None
    hospital_branch: Optional[str] = None
    total_capacity: Optional[int] = None
    currently_used: Optional[int] = None
    status: Optional[str] = None


class TaskCreate(BaseModel):
    patient_id: str
    assigned_to: Optional[int] = None
    title: str
    description: Optional[str] = None
    priority: str = "medium"
    due_date: Optional[str] = None


class TaskStatusUpdate(BaseModel):
    status: str


class TriageInput(BaseModel):
    patient_id: str
    severity_score: int
    treatment_urgency: int
    vital_risk_score: int
    icu_required: str = "No"


class NotificationCreate(BaseModel):
    patient_id: Optional[str] = None
    message: str
    severity: str = "info"
    user_id: Optional[int] = None


def row_to_dict(row):
    if row is None:
        return None
    return dict(row)


def rows_to_list(rows):
    return [dict(r) for r in rows]


# --- Health ---

@app.get("/healthz")
async def healthz():
    return {"status": "ok"}


# --- Auth ---

@app.post("/api/auth/login")
async def login(payload: LoginRequest):
    with get_db() as conn:
        user = conn.execute(
            "SELECT id, username, email, full_name, role, is_active FROM users WHERE username = ? AND hashed_password = ?",
            (payload.username, payload.password),
        ).fetchone()
        if not user:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        user_dict = dict(user)
        if not user_dict["is_active"]:
            raise HTTPException(status_code=403, detail="Account disabled")
        return {"user": user_dict, "token": f"mock-token-{user_dict['id']}"}


@app.get("/api/auth/me")
async def get_me(user_id: int = Query(1)):
    with get_db() as conn:
        user = conn.execute(
            "SELECT id, username, email, full_name, role, is_active FROM users WHERE id = ?",
            (user_id,),
        ).fetchone()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return dict(user)


# --- Patients ---

@app.get("/api/patients")
async def get_patients(
    priority_group: Optional[str] = None,
    region: Optional[str] = None,
    hospital_branch: Optional[str] = None,
    doctor: Optional[str] = None,
    limit: int = Query(200, ge=1, le=1000),
    offset: int = Query(0, ge=0),
):
    with get_db() as conn:
        query = "SELECT * FROM patients WHERE 1=1"
        params: list = []
        if priority_group:
            query += " AND priority_group = ?"
            params.append(priority_group)
        if region:
            query += " AND region = ?"
            params.append(region)
        if hospital_branch:
            query += " AND hospital_branch = ?"
            params.append(hospital_branch)
        if doctor:
            query += " AND doctor_assigned = ?"
            params.append(doctor)
        query += " ORDER BY record_date DESC, patient_id LIMIT ? OFFSET ?"
        params.extend([limit, offset])
        rows = conn.execute(query, params).fetchall()
        total = conn.execute(
            "SELECT COUNT(*) FROM patients WHERE 1=1"
            + (" AND priority_group = ?" if priority_group else "")
            + (" AND region = ?" if region else "")
            + (" AND hospital_branch = ?" if hospital_branch else "")
            + (" AND doctor_assigned = ?" if doctor else ""),
            [p for p in [priority_group, region, hospital_branch, doctor] if p],
        ).fetchone()[0]
        return {"patients": rows_to_list(rows), "total": total}


@app.get("/api/patients/latest")
async def get_latest_patients(
    priority_group: Optional[str] = None,
    region: Optional[str] = None,
    hospital_branch: Optional[str] = None,
):
    with get_db() as conn:
        max_date = conn.execute("SELECT MAX(record_date) FROM patients").fetchone()[0]
        if not max_date:
            return {"record_date": None, "patients": []}
        query = "SELECT * FROM patients WHERE record_date = ?"
        params: list = [max_date]
        if priority_group:
            query += " AND priority_group = ?"
            params.append(priority_group)
        if region:
            query += " AND region = ?"
            params.append(region)
        if hospital_branch:
            query += " AND hospital_branch = ?"
            params.append(hospital_branch)
        query += " ORDER BY severity_score DESC"
        rows = conn.execute(query, params).fetchall()
        return {"record_date": max_date, "patients": rows_to_list(rows)}


@app.get("/api/patients/assigned")
async def get_assigned_patients(doctor: str = Query("Dr. Smith")):
    with get_db() as conn:
        max_date = conn.execute("SELECT MAX(record_date) FROM patients").fetchone()[0]
        if not max_date:
            return {"patients": []}
        rows = conn.execute(
            "SELECT * FROM patients WHERE record_date = ? AND doctor_assigned = ? ORDER BY severity_score DESC",
            (max_date, doctor),
        ).fetchall()
        return {"patients": rows_to_list(rows)}


@app.get("/api/patients/{patient_id}")
async def get_patient(patient_id: str):
    with get_db() as conn:
        row = conn.execute(
            "SELECT * FROM patients WHERE patient_id = ? ORDER BY record_date DESC LIMIT 1",
            (patient_id,),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Patient not found")
        return row_to_dict(row)


@app.get("/api/patients/{patient_id}/history")
async def get_patient_history(patient_id: str):
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM patients WHERE patient_id = ? ORDER BY record_date ASC",
            (patient_id,),
        ).fetchall()
        return {"patient_id": patient_id, "history": rows_to_list(rows)}


@app.get("/api/patients/export/data")
async def export_patients(format: str = Query("csv")):
    with get_db() as conn:
        max_date = conn.execute("SELECT MAX(record_date) FROM patients").fetchone()[0]
        rows = conn.execute(
            "SELECT * FROM patients WHERE record_date = ? ORDER BY severity_score DESC",
            (max_date,),
        ).fetchall()
        data = rows_to_list(rows)

    if format == "csv":
        output = io.StringIO()
        if data:
            writer = csv.DictWriter(output, fieldnames=data[0].keys())
            writer.writeheader()
            writer.writerows(data)
        output.seek(0)
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=patients_export.csv"},
        )
    elif format == "xlsx":
        import openpyxl

        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Patients"
        if data:
            ws.append(list(data[0].keys()))
            for row in data:
                ws.append(list(row.values()))
        output = io.BytesIO()
        wb.save(output)
        output.seek(0)
        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=patients_export.xlsx"},
        )
    raise HTTPException(status_code=400, detail="Format must be csv or xlsx")


# --- Dashboard ---

@app.get("/api/dashboard/summary")
async def dashboard_summary():
    with get_db() as conn:
        max_date = conn.execute("SELECT MAX(record_date) FROM patients").fetchone()[0]
        if not max_date:
            return {
                "record_date": None,
                "total_patients": 0,
                "critical": 0,
                "moderate": 0,
                "stable": 0,
            }

        latest = conn.execute(
            "SELECT * FROM patients WHERE record_date = ?", (max_date,)
        ).fetchall()
        data = rows_to_list(latest)

        total = len(data)
        critical = sum(1 for p in data if p["priority_group"] == "Critical")
        moderate = sum(1 for p in data if p["priority_group"] == "Moderate")
        stable = sum(1 for p in data if p["priority_group"] == "Stable")
        icu_occupied = sum(1 for p in data if p["icu_required"] == "Yes")
        beds_needed = sum(1 for p in data if p["bed_required"] == "Yes")

        bed_stats = conn.execute(
            "SELECT SUM(total_capacity) as total, SUM(currently_used) as used FROM resources WHERE resource_type = 'bed'"
        ).fetchone()
        beds_total = bed_stats["total"] or 0
        beds_used = bed_stats["used"] or 0

        return {
            "record_date": max_date,
            "total_patients": total,
            "critical": critical,
            "moderate": moderate,
            "stable": stable,
            "icu_occupied": icu_occupied,
            "beds_needed": beds_needed,
            "beds_total": beds_total,
            "beds_used": beds_used,
            "beds_available": beds_total - beds_used,
        }


@app.get("/api/dashboard/heatmap")
async def dashboard_heatmap():
    with get_db() as conn:
        max_date = conn.execute("SELECT MAX(record_date) FROM patients").fetchone()[0]
        if not max_date:
            return {"heatmap": []}
        rows = conn.execute(
            """SELECT region, priority_group, COUNT(*) as count
               FROM patients WHERE record_date = ?
               GROUP BY region, priority_group
               ORDER BY region, priority_group""",
            (max_date,),
        ).fetchall()
        return {"heatmap": rows_to_list(rows)}


@app.get("/api/dashboard/region-stats")
async def dashboard_region_stats():
    with get_db() as conn:
        max_date = conn.execute("SELECT MAX(record_date) FROM patients").fetchone()[0]
        if not max_date:
            return {"regions": []}
        rows = conn.execute(
            """SELECT region,
                      SUM(CASE WHEN priority_group='Critical' THEN 1 ELSE 0 END) as critical,
                      SUM(CASE WHEN priority_group='Moderate' THEN 1 ELSE 0 END) as moderate,
                      SUM(CASE WHEN priority_group='Stable' THEN 1 ELSE 0 END) as stable,
                      COUNT(*) as total
               FROM patients WHERE record_date = ?
               GROUP BY region ORDER BY region""",
            (max_date,),
        ).fetchall()
        return {"regions": rows_to_list(rows)}


# --- Classification Rules ---

@app.get("/api/rules")
async def get_rules():
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM classification_rules ORDER BY priority_order"
        ).fetchall()
        return {"rules": rows_to_list(rows)}


@app.post("/api/rules")
async def create_rule(rule: RuleCreate, user_id: int = Query(1)):
    with get_db() as conn:
        cursor = conn.execute(
            """INSERT INTO classification_rules
            (rule_name, description, field, operator, threshold_value, target_severity, priority_order, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                rule.rule_name,
                rule.description,
                rule.field,
                rule.operator,
                rule.threshold_value,
                rule.target_severity,
                rule.priority_order,
                user_id,
            ),
        )
        rule_id = cursor.lastrowid
        conn.execute(
            "INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)",
            (user_id, "CREATE", "classification_rules", rule_id, f"Created rule: {rule.rule_name}"),
        )
        new_rule = conn.execute(
            "SELECT * FROM classification_rules WHERE id = ?", (rule_id,)
        ).fetchone()
        return row_to_dict(new_rule)


@app.put("/api/rules/{rule_id}")
async def update_rule(rule_id: int, rule: RuleUpdate, user_id: int = Query(1)):
    with get_db() as conn:
        existing = conn.execute(
            "SELECT * FROM classification_rules WHERE id = ?", (rule_id,)
        ).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Rule not found")

        updates = {}
        if rule.rule_name is not None:
            updates["rule_name"] = rule.rule_name
        if rule.description is not None:
            updates["description"] = rule.description
        if rule.field is not None:
            updates["field"] = rule.field
        if rule.operator is not None:
            updates["operator"] = rule.operator
        if rule.threshold_value is not None:
            updates["threshold_value"] = rule.threshold_value
        if rule.target_severity is not None:
            updates["target_severity"] = rule.target_severity
        if rule.priority_order is not None:
            updates["priority_order"] = rule.priority_order

        if updates:
            updates["updated_at"] = datetime.utcnow().isoformat()
            set_clause = ", ".join(f"{k} = ?" for k in updates)
            values = list(updates.values()) + [rule_id]
            conn.execute(
                f"UPDATE classification_rules SET {set_clause} WHERE id = ?", values
            )
            conn.execute(
                "INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)",
                (
                    user_id,
                    "UPDATE",
                    "classification_rules",
                    rule_id,
                    f"Updated rule fields: {list(updates.keys())}",
                ),
            )

        updated = conn.execute(
            "SELECT * FROM classification_rules WHERE id = ?", (rule_id,)
        ).fetchone()
        return row_to_dict(updated)


@app.delete("/api/rules/{rule_id}")
async def delete_rule(rule_id: int, user_id: int = Query(1)):
    with get_db() as conn:
        existing = conn.execute(
            "SELECT * FROM classification_rules WHERE id = ?", (rule_id,)
        ).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Rule not found")
        conn.execute("DELETE FROM classification_rules WHERE id = ?", (rule_id,))
        conn.execute(
            "INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)",
            (
                user_id,
                "DELETE",
                "classification_rules",
                rule_id,
                f"Deleted rule: {dict(existing)['rule_name']}",
            ),
        )
        return {"message": "Rule deleted"}


@app.patch("/api/rules/{rule_id}/toggle")
async def toggle_rule(rule_id: int, user_id: int = Query(1)):
    with get_db() as conn:
        existing = conn.execute(
            "SELECT * FROM classification_rules WHERE id = ?", (rule_id,)
        ).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Rule not found")
        new_active = 0 if dict(existing)["is_active"] else 1
        conn.execute(
            "UPDATE classification_rules SET is_active = ?, updated_at = ? WHERE id = ?",
            (new_active, datetime.utcnow().isoformat(), rule_id),
        )
        conn.execute(
            "INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)",
            (
                user_id,
                "TOGGLE",
                "classification_rules",
                rule_id,
                f"{'Activated' if new_active else 'Deactivated'} rule: {dict(existing)['rule_name']}",
            ),
        )
        updated = conn.execute(
            "SELECT * FROM classification_rules WHERE id = ?", (rule_id,)
        ).fetchone()
        return row_to_dict(updated)


# --- Resources ---

@app.get("/api/resources")
async def get_resources(
    resource_type: Optional[str] = None, hospital_branch: Optional[str] = None
):
    with get_db() as conn:
        query = "SELECT * FROM resources WHERE 1=1"
        params: list = []
        if resource_type:
            query += " AND resource_type = ?"
            params.append(resource_type)
        if hospital_branch:
            query += " AND hospital_branch = ?"
            params.append(hospital_branch)
        query += " ORDER BY resource_type, hospital_branch"
        rows = conn.execute(query, params).fetchall()
        return {"resources": rows_to_list(rows)}


@app.get("/api/resources/utilization")
async def resource_utilization():
    with get_db() as conn:
        types = conn.execute(
            """SELECT resource_type,
                      SUM(total_capacity) as total_capacity,
                      SUM(currently_used) as currently_used
               FROM resources GROUP BY resource_type"""
        ).fetchall()
        result = []
        for t in types:
            d = dict(t)
            total = d["total_capacity"] or 1
            used = d["currently_used"] or 0
            d["utilization_pct"] = round((used / total) * 100, 1)
            d["available"] = total - used
            result.append(d)
        return {"utilization": result}


@app.post("/api/resources")
async def create_resource(resource: ResourceCreate, user_id: int = Query(1)):
    with get_db() as conn:
        cursor = conn.execute(
            "INSERT INTO resources (resource_type, resource_name, hospital_branch, total_capacity, currently_used, status) VALUES (?, ?, ?, ?, ?, ?)",
            (
                resource.resource_type,
                resource.resource_name,
                resource.hospital_branch,
                resource.total_capacity,
                resource.currently_used,
                resource.status,
            ),
        )
        conn.execute(
            "INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)",
            (
                user_id,
                "CREATE",
                "resources",
                cursor.lastrowid,
                f"Created resource: {resource.resource_name}",
            ),
        )
        new = conn.execute(
            "SELECT * FROM resources WHERE id = ?", (cursor.lastrowid,)
        ).fetchone()
        return row_to_dict(new)


@app.put("/api/resources/{resource_id}")
async def update_resource(
    resource_id: int, resource: ResourceUpdate, user_id: int = Query(1)
):
    with get_db() as conn:
        existing = conn.execute(
            "SELECT * FROM resources WHERE id = ?", (resource_id,)
        ).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Resource not found")
        updates = {}
        if resource.resource_name is not None:
            updates["resource_name"] = resource.resource_name
        if resource.hospital_branch is not None:
            updates["hospital_branch"] = resource.hospital_branch
        if resource.total_capacity is not None:
            updates["total_capacity"] = resource.total_capacity
        if resource.currently_used is not None:
            updates["currently_used"] = resource.currently_used
        if resource.status is not None:
            updates["status"] = resource.status
        if updates:
            updates["updated_at"] = datetime.utcnow().isoformat()
            set_clause = ", ".join(f"{k} = ?" for k in updates)
            values = list(updates.values()) + [resource_id]
            conn.execute(f"UPDATE resources SET {set_clause} WHERE id = ?", values)
        updated = conn.execute(
            "SELECT * FROM resources WHERE id = ?", (resource_id,)
        ).fetchone()
        return row_to_dict(updated)


# --- Triage ---

@app.post("/api/triage/classify")
async def triage_classify(payload: TriageInput):
    with get_db() as conn:
        rules = conn.execute(
            "SELECT * FROM classification_rules WHERE is_active = 1 ORDER BY priority_order"
        ).fetchall()

    result_group = "Stable"
    matched_rule = None

    for rule in rules:
        r = dict(rule)
        field_map = {
            "ICU_Required": 1 if payload.icu_required == "Yes" else 0,
            "Severity_Score": payload.severity_score,
            "Treatment_Urgency": payload.treatment_urgency,
            "Vital_Risk_Score": payload.vital_risk_score,
        }
        field_val = field_map.get(r["field"])
        if field_val is None:
            continue

        threshold = r["threshold_value"]
        op = r["operator"]
        matched = False
        if op == ">=" and field_val >= threshold:
            matched = True
        elif op == "<=" and field_val <= threshold:
            matched = True
        elif op == "==" and field_val == threshold:
            matched = True
        elif op == ">" and field_val > threshold:
            matched = True
        elif op == "<" and field_val < threshold:
            matched = True
        elif op == "!=" and field_val != threshold:
            matched = True

        if matched:
            result_group = r["target_severity"]
            matched_rule = r["rule_name"]
            break

    return {
        "patient_id": payload.patient_id,
        "priority_group": result_group,
        "matched_rule": matched_rule,
        "reasoning": f"Matched rule '{matched_rule}'"
        if matched_rule
        else "No rule matched, defaulting to Stable",
    }


# --- Tasks ---

@app.get("/api/tasks")
async def get_tasks(
    assigned_to: Optional[int] = None,
    status: Optional[str] = None,
    patient_id: Optional[str] = None,
):
    with get_db() as conn:
        query = "SELECT * FROM tasks WHERE 1=1"
        params: list = []
        if assigned_to:
            query += " AND assigned_to = ?"
            params.append(assigned_to)
        if status:
            query += " AND status = ?"
            params.append(status)
        if patient_id:
            query += " AND patient_id = ?"
            params.append(patient_id)
        query += " ORDER BY CASE priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END, due_date"
        rows = conn.execute(query, params).fetchall()
        return {"tasks": rows_to_list(rows)}


@app.post("/api/tasks")
async def create_task(task: TaskCreate):
    with get_db() as conn:
        cursor = conn.execute(
            "INSERT INTO tasks (patient_id, assigned_to, title, description, priority, due_date) VALUES (?, ?, ?, ?, ?, ?)",
            (
                task.patient_id,
                task.assigned_to,
                task.title,
                task.description,
                task.priority,
                task.due_date,
            ),
        )
        new = conn.execute(
            "SELECT * FROM tasks WHERE id = ?", (cursor.lastrowid,)
        ).fetchone()
        return row_to_dict(new)


@app.patch("/api/tasks/{task_id}/status")
async def update_task_status(task_id: int, payload: TaskStatusUpdate):
    with get_db() as conn:
        existing = conn.execute(
            "SELECT * FROM tasks WHERE id = ?", (task_id,)
        ).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Task not found")
        completed_at = (
            datetime.utcnow().isoformat() if payload.status == "completed" else None
        )
        conn.execute(
            "UPDATE tasks SET status = ?, completed_at = ? WHERE id = ?",
            (payload.status, completed_at, task_id),
        )
        updated = conn.execute(
            "SELECT * FROM tasks WHERE id = ?", (task_id,)
        ).fetchone()
        return row_to_dict(updated)


@app.patch("/api/tasks/{task_id}/complete")
async def complete_task(task_id: int):
    with get_db() as conn:
        existing = conn.execute(
            "SELECT * FROM tasks WHERE id = ?", (task_id,)
        ).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Task not found")
        conn.execute(
            "UPDATE tasks SET status = 'completed', completed_at = ? WHERE id = ?",
            (datetime.utcnow().isoformat(), task_id),
        )
        updated = conn.execute(
            "SELECT * FROM tasks WHERE id = ?", (task_id,)
        ).fetchone()
        return row_to_dict(updated)


# --- Notifications ---

@app.get("/api/notifications")
async def get_notifications(
    severity: Optional[str] = None,
    user_id: Optional[int] = None,
    unread_only: bool = False,
):
    with get_db() as conn:
        query = "SELECT * FROM notifications WHERE 1=1"
        params: list = []
        if severity:
            severities = severity.split(",")
            placeholders = ",".join("?" * len(severities))
            query += f" AND severity IN ({placeholders})"
            params.extend(severities)
        if user_id:
            query += " AND (user_id = ? OR user_id IS NULL)"
            params.append(user_id)
        if unread_only:
            query += " AND is_read = 0"
        query += " ORDER BY created_at DESC"
        rows = conn.execute(query, params).fetchall()
        return {"notifications": rows_to_list(rows)}


@app.post("/api/notifications")
async def create_notification(notification: NotificationCreate):
    with get_db() as conn:
        cursor = conn.execute(
            "INSERT INTO notifications (user_id, patient_id, message, severity) VALUES (?, ?, ?, ?)",
            (
                notification.user_id,
                notification.patient_id,
                notification.message,
                notification.severity,
            ),
        )
        new = conn.execute(
            "SELECT * FROM notifications WHERE id = ?", (cursor.lastrowid,)
        ).fetchone()
        notif_dict = row_to_dict(new)
        await broadcast_notification(notif_dict)
        return notif_dict


@app.patch("/api/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: int):
    with get_db() as conn:
        conn.execute(
            "UPDATE notifications SET is_read = 1 WHERE id = ?", (notification_id,)
        )
        updated = conn.execute(
            "SELECT * FROM notifications WHERE id = ?", (notification_id,)
        ).fetchone()
        if not updated:
            raise HTTPException(status_code=404, detail="Notification not found")
        return row_to_dict(updated)


@app.patch("/api/notifications/read-all")
async def mark_all_notifications_read(user_id: Optional[int] = None):
    with get_db() as conn:
        if user_id:
            conn.execute(
                "UPDATE notifications SET is_read = 1 WHERE user_id = ? OR user_id IS NULL",
                (user_id,),
            )
        else:
            conn.execute("UPDATE notifications SET is_read = 1")
        return {"message": "All notifications marked as read"}


# --- Audit Logs ---

@app.get("/api/audit-logs")
async def get_audit_logs(
    action: Optional[str] = None,
    entity_type: Optional[str] = None,
    user_id: Optional[int] = None,
    limit: int = Query(50, ge=1, le=500),
):
    with get_db() as conn:
        query = """SELECT a.*, u.full_name as user_name, u.role as user_role
                   FROM audit_logs a LEFT JOIN users u ON a.user_id = u.id WHERE 1=1"""
        params: list = []
        if action:
            query += " AND a.action = ?"
            params.append(action)
        if entity_type:
            query += " AND a.entity_type = ?"
            params.append(entity_type)
        if user_id:
            query += " AND a.user_id = ?"
            params.append(user_id)
        query += " ORDER BY a.timestamp DESC LIMIT ?"
        params.append(limit)
        rows = conn.execute(query, params).fetchall()
        return {"audit_logs": rows_to_list(rows)}


# --- Stats ---

@app.get("/api/stats/patients/count")
async def patients_count():
    with get_db() as conn:
        max_date = conn.execute(
            "SELECT MAX(record_date) FROM patients"
        ).fetchone()[0]
        if not max_date:
            return {"count": 0}
        count = conn.execute(
            "SELECT COUNT(DISTINCT patient_id) FROM patients WHERE record_date = ?",
            (max_date,),
        ).fetchone()[0]
        return {"count": count}


@app.get("/api/stats/rules/active")
async def active_rules_count():
    with get_db() as conn:
        count = conn.execute(
            "SELECT COUNT(*) FROM classification_rules WHERE is_active = 1"
        ).fetchone()[0]
        return {"count": count}


@app.get("/api/stats/users/active")
async def active_users_count():
    with get_db() as conn:
        count = conn.execute(
            "SELECT COUNT(*) FROM users WHERE is_active = 1"
        ).fetchone()[0]
        return {"count": count}


@app.get("/api/stats/classification-trend")
async def classification_trend():
    with get_db() as conn:
        rows = conn.execute(
            """SELECT record_date as date,
                      SUM(CASE WHEN priority_group='Critical' THEN 1 ELSE 0 END) as critical,
                      SUM(CASE WHEN priority_group='Moderate' THEN 1 ELSE 0 END) as moderate,
                      SUM(CASE WHEN priority_group='Stable' THEN 1 ELSE 0 END) as stable
               FROM patients GROUP BY record_date ORDER BY record_date"""
        ).fetchall()
        return {"trend": rows_to_list(rows)}


# --- Filters ---

@app.get("/api/filters/regions")
async def get_regions():
    with get_db() as conn:
        rows = conn.execute(
            "SELECT DISTINCT region FROM patients ORDER BY region"
        ).fetchall()
        return {"regions": [r["region"] for r in rows]}


@app.get("/api/filters/branches")
async def get_branches():
    with get_db() as conn:
        rows = conn.execute(
            "SELECT DISTINCT hospital_branch FROM patients ORDER BY hospital_branch"
        ).fetchall()
        return {"branches": [r["hospital_branch"] for r in rows]}


@app.get("/api/filters/doctors")
async def get_doctors():
    with get_db() as conn:
        rows = conn.execute(
            "SELECT DISTINCT doctor_assigned FROM patients ORDER BY doctor_assigned"
        ).fetchall()
        return {"doctors": [r["doctor_assigned"] for r in rows]}


# --- WebSocket ---

class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                disconnected.append(connection)
        for conn in disconnected:
            self.disconnect(conn)


ws_manager = ConnectionManager()


async def broadcast_notification(notification: dict):
    await ws_manager.broadcast({"type": "notification", "data": notification})


@app.websocket("/ws/alerts")
async def websocket_alerts(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            await websocket.send_json({"type": "ack", "message": "received"})
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)


@app.websocket("/ws/notifications")
async def websocket_notifications(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            await websocket.send_json({"type": "ack", "message": "received"})
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)

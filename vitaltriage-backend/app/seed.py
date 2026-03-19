"""Seed the database with mock data for VitalTriage AI."""

import csv
import os
from pathlib import Path
from datetime import datetime, timedelta
import random

from app.database import get_db, init_db

PATIENTS_CSV = Path(__file__).resolve().parent / "patients.csv"


def seed_users(conn):
    users = [
        ("admin1", "admin@vitaltriage.ai", "admin123", "System Admin", "admin"),
        ("manager1", "manager@vitaltriage.ai", "manager123", "Operations Manager", "manager"),
        ("drsmith", "smith@vitaltriage.ai", "doctor123", "Dr. Smith", "clinician"),
        ("drlee", "lee@vitaltriage.ai", "doctor123", "Dr. Lee", "clinician"),
        ("drpatel", "patel@vitaltriage.ai", "doctor123", "Dr. Patel", "clinician"),
        ("drbrown", "brown@vitaltriage.ai", "doctor123", "Dr. Brown", "clinician"),
        ("drgarcia", "garcia@vitaltriage.ai", "doctor123", "Dr. Garcia", "clinician"),
        ("drwilson", "wilson@vitaltriage.ai", "doctor123", "Dr. Wilson", "clinician"),
        ("dradams", "adams@vitaltriage.ai", "doctor123", "Dr. Adams", "clinician"),
    ]
    for u in users:
        conn.execute(
            "INSERT OR IGNORE INTO users (username, email, hashed_password, full_name, role) VALUES (?, ?, ?, ?, ?)",
            u,
        )
    print(f"Seeded {len(users)} users")


def seed_patients(conn):
    if not PATIENTS_CSV.exists():
        print("patients.csv not found, skipping patient seed")
        return

    with open(PATIENTS_CSV, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f, delimiter=";")
        count = 0
        for row in reader:
            # Parse date
            raw_date = row.get("Record_Date", "").strip()
            try:
                record_date = datetime.strptime(raw_date, "%d/%m/%Y").strftime("%Y-%m-%d")
            except ValueError:
                try:
                    record_date = datetime.strptime(raw_date, "%Y-%m-%d").strftime("%Y-%m-%d")
                except ValueError:
                    continue

            conn.execute(
                """INSERT OR IGNORE INTO patients
                (patient_id, record_date, age, gender, primary_condition,
                 severity_score, treatment_urgency, vital_risk_score,
                 comorbidity_count, recent_admissions_last_6m, medication_adherence,
                 last_visit_days_ago, insurance_type, care_plan_assigned,
                 doctor_assigned, follow_up_required, readmission_risk,
                 region, hospital_branch, appointment_status,
                 lab_test_pending, bed_required, icu_required,
                 discharge_priority, priority_group)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    row.get("Patient_ID", "").strip(),
                    record_date,
                    int(row.get("Age", 0)),
                    row.get("Gender", "").strip(),
                    row.get("Primary_Condition", "").strip(),
                    int(row.get("Severity_Score", 0)),
                    int(row.get("Treatment_Urgency", 0)),
                    int(row.get("Vital_Risk_Score", 0)),
                    int(row.get("Comorbidity_Count", 0)),
                    int(row.get("Recent_Admissions_Last_6M", 0)),
                    int(row.get("Medication_Adherence", 0)),
                    int(row.get("Last_Visit_Days_Ago", 0)),
                    row.get("Insurance_Type", "").strip(),
                    row.get("Care_Plan_Assigned", "").strip(),
                    row.get("Doctor_Assigned", "").strip(),
                    row.get("Follow_Up_Required", "").strip(),
                    row.get("Readmission_Risk", "").strip(),
                    row.get("Region", "").strip(),
                    row.get("Hospital_Branch", "").strip(),
                    row.get("Appointment_Status", "").strip(),
                    row.get("Lab_Test_Pending", "").strip(),
                    row.get("Bed_Required", "").strip(),
                    row.get("ICU_Required", "").strip(),
                    row.get("Discharge_Priority", "").strip(),
                    row.get("Priority_Group", "").strip(),
                ),
            )
            count += 1
    print(f"Seeded {count} patient records")


def seed_classification_rules(conn):
    rules = [
        ("ICU Auto-Critical", "Auto-classify ICU patients as Critical", "ICU_Required", "==", 1, "Critical", 1),
        ("High Severity Score", "Severity score >= 8 is Critical", "Severity_Score", ">=", 8, "Critical", 2),
        ("Urgent + High Risk", "Treatment urgency >= 8 AND vital risk >= 7", "Treatment_Urgency", ">=", 8, "Critical", 3),
        ("Moderate Severity", "Severity score 5-7 is Moderate", "Severity_Score", ">=", 5, "Moderate", 4),
        ("Default Stable", "Severity score < 5 is Stable", "Severity_Score", "<", 5, "Stable", 5),
    ]
    for r in rules:
        conn.execute(
            """INSERT OR IGNORE INTO classification_rules
            (rule_name, description, field, operator, threshold_value, target_severity, priority_order, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, 1)""",
            r,
        )
    print(f"Seeded {len(rules)} classification rules")


def seed_resources(conn):
    resources = [
        ("bed", "ICU Bed A1", "Central Hospital", 1, 1, "occupied"),
        ("bed", "ICU Bed A2", "Central Hospital", 1, 0, "available"),
        ("bed", "ICU Bed A3", "Central Hospital", 1, 1, "occupied"),
        ("bed", "General Ward B1-B10", "Central Hospital", 10, 7, "available"),
        ("bed", "General Ward C1-C8", "General Hospital", 8, 5, "available"),
        ("bed", "General Ward D1-D6", "West Clinic", 6, 3, "available"),
        ("bed", "ICU Bed B1", "General Hospital", 1, 1, "occupied"),
        ("bed", "ICU Bed B2", "General Hospital", 1, 0, "available"),
        ("bed", "Pediatric Ward E1-E4", "East Medical Center", 4, 2, "available"),
        ("staff", "Nurses (Day Shift)", "Central Hospital", 20, 16, "available"),
        ("staff", "Nurses (Night Shift)", "Central Hospital", 15, 12, "available"),
        ("staff", "Doctors On-Call", "Central Hospital", 10, 8, "available"),
        ("staff", "Nurses (Day Shift)", "General Hospital", 15, 11, "available"),
        ("staff", "Doctors On-Call", "General Hospital", 8, 6, "available"),
        ("staff", "Nurses (Day Shift)", "West Clinic", 8, 5, "available"),
        ("staff", "Doctors On-Call", "West Clinic", 4, 3, "available"),
        ("equipment", "Ventilators", "Central Hospital", 10, 4, "available"),
        ("equipment", "Cardiac Monitors", "Central Hospital", 15, 10, "available"),
        ("equipment", "Infusion Pumps", "Central Hospital", 20, 14, "available"),
        ("equipment", "Ventilators", "General Hospital", 6, 4, "available"),
        ("equipment", "Cardiac Monitors", "General Hospital", 12, 8, "available"),
        ("equipment", "Infusion Pumps", "West Clinic", 6, 3, "available"),
        ("equipment", "Defibrillators", "Central Hospital", 5, 2, "available"),
        ("equipment", "X-Ray Machines", "East Medical Center", 3, 1, "available"),
    ]
    for r in resources:
        conn.execute(
            "INSERT OR IGNORE INTO resources (resource_type, resource_name, hospital_branch, total_capacity, currently_used, status) VALUES (?, ?, ?, ?, ?, ?)",
            r,
        )
    print(f"Seeded {len(resources)} resources")


def seed_notifications(conn):
    notifications = [
        (None, "P001", "Severity score increased to 9 - ICU admission required", "critical"),
        (None, "P004", "Chronic Kidney Disease patient showing elevated vital risk score", "critical"),
        (None, "P006", "COPD patient ICU threshold crossed - immediate attention needed", "critical"),
        (None, "P009", "Stroke Recovery patient severity trending upward", "warning"),
        (None, "P011", "Cancer Therapy patient requires ICU bed allocation", "critical"),
        (None, "P013", "Coronary Artery Disease patient - cardiac monitor alert", "warning"),
        (None, "P008", "Pneumonia patient severity trending upward to Moderate-High", "warning"),
        (None, "P002", "Diabetes patient lab results pending review", "info"),
        (None, "P003", "Asthma patient stable - eligible for discharge assessment", "info"),
        (None, "P016", "Liver Disease patient medication adherence declining", "warning"),
        (None, "P019", "Dementia patient requires geriatric specialist review", "warning"),
        (None, "P001", "Heart Failure patient ventilator support may be required", "critical"),
    ]
    for n in notifications:
        conn.execute(
            "INSERT INTO notifications (user_id, patient_id, message, severity) VALUES (?, ?, ?, ?)",
            n,
        )
    print(f"Seeded {len(notifications)} notifications")


def seed_tasks(conn):
    tasks = [
        ("P001", 3, "Review ICU vitals", "Check and document ICU patient vitals every 2 hours", "in_progress", "urgent", "2026-03-19"),
        ("P001", 3, "Cardiology consult", "Arrange cardiology consultation for Heart Failure management", "pending", "high", "2026-03-20"),
        ("P004", 6, "Dialysis scheduling", "Schedule next dialysis session for CKD patient", "pending", "high", "2026-03-19"),
        ("P006", 8, "COPD respiratory therapy", "Administer nebulizer treatment and monitor SpO2", "in_progress", "urgent", "2026-03-19"),
        ("P009", 3, "Post-stroke assessment", "Conduct neurological assessment and update care plan", "pending", "high", "2026-03-20"),
        ("P011", 6, "Chemotherapy prep", "Prepare chemotherapy protocol and verify blood counts", "pending", "high", "2026-03-21"),
        ("P002", 4, "Diabetes follow-up", "Review HbA1c levels and adjust insulin dosage", "completed", "medium", "2026-03-18"),
        ("P003", 5, "Discharge planning", "Prepare discharge summary and follow-up instructions", "pending", "low", "2026-03-22"),
        ("P008", 4, "Pneumonia antibiotics review", "Evaluate antibiotic response and adjust treatment", "in_progress", "high", "2026-03-19"),
        ("P013", 8, "Cardiac monitoring", "Review continuous cardiac monitoring data and ECG", "in_progress", "urgent", "2026-03-19"),
        ("P016", 3, "Liver function tests", "Order and review comprehensive liver function panel", "pending", "medium", "2026-03-20"),
        ("P019", 6, "Geriatric evaluation", "Comprehensive geriatric assessment and cognitive testing", "pending", "medium", "2026-03-21"),
    ]
    for t in tasks:
        conn.execute(
            """INSERT INTO tasks (patient_id, assigned_to, title, description, status, priority, due_date)
            VALUES (?, ?, ?, ?, ?, ?, ?)""",
            t,
        )
    print(f"Seeded {len(tasks)} tasks")


def seed_audit_logs(conn):
    logs = [
        (1, "CREATE", "classification_rules", 1, "Created rule: ICU Auto-Critical"),
        (1, "CREATE", "classification_rules", 2, "Created rule: High Severity Score"),
        (1, "CREATE", "classification_rules", 3, "Created rule: Urgent + High Risk"),
        (1, "CREATE", "classification_rules", 4, "Created rule: Moderate Severity"),
        (1, "CREATE", "classification_rules", 5, "Created rule: Default Stable"),
        (1, "UPDATE", "resources", 1, "Updated ICU Bed A1 status to occupied"),
        (2, "VIEW", "dashboard", None, "Accessed manager dashboard summary"),
        (3, "VIEW", "patients", None, "Viewed patient P001 history"),
        (1, "CREATE", "users", 3, "Created clinician account: Dr. Smith"),
    ]
    for log in logs:
        conn.execute(
            "INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)",
            log,
        )
    print(f"Seeded {len(logs)} audit logs")


def run_seed():
    init_db()
    with get_db() as conn:
        # Check if already seeded
        count = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]
        if count > 0:
            print("Database already seeded, skipping.")
            return

        seed_users(conn)
        seed_patients(conn)
        seed_classification_rules(conn)
        seed_resources(conn)
        seed_notifications(conn)
        seed_tasks(conn)
        seed_audit_logs(conn)
        print("Database seeding complete!")


if __name__ == "__main__":
    run_seed()

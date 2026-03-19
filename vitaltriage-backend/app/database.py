import sqlite3
import os
from contextlib import contextmanager
from pathlib import Path

DB_DIR = Path(__file__).resolve().parent.parent
DB_PATH = os.environ.get("DATABASE_PATH", str(DB_DIR / "vitaltriage.db"))


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


@contextmanager
def get_db():
    conn = get_connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db():
    with get_db() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                hashed_password TEXT NOT NULL,
                full_name TEXT NOT NULL,
                role TEXT NOT NULL CHECK(role IN ('admin', 'manager', 'clinician')),
                is_active BOOLEAN DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS patients (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                patient_id TEXT NOT NULL,
                record_date DATE NOT NULL,
                age INTEGER,
                gender TEXT,
                primary_condition TEXT,
                severity_score INTEGER,
                treatment_urgency INTEGER,
                vital_risk_score INTEGER,
                comorbidity_count INTEGER,
                recent_admissions_last_6m INTEGER,
                medication_adherence INTEGER,
                last_visit_days_ago INTEGER,
                insurance_type TEXT,
                care_plan_assigned TEXT,
                doctor_assigned TEXT,
                follow_up_required TEXT,
                readmission_risk TEXT,
                region TEXT,
                hospital_branch TEXT,
                appointment_status TEXT,
                lab_test_pending TEXT,
                bed_required TEXT,
                icu_required TEXT,
                discharge_priority TEXT,
                priority_group TEXT CHECK(priority_group IN ('Critical', 'Moderate', 'Stable')),
                UNIQUE(patient_id, record_date)
            );

            CREATE TABLE IF NOT EXISTS classification_rules (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                rule_name TEXT NOT NULL,
                description TEXT,
                field TEXT NOT NULL,
                operator TEXT NOT NULL CHECK(operator IN ('>=', '<=', '==', '>', '<', '!=')),
                threshold_value REAL NOT NULL,
                target_severity TEXT NOT NULL CHECK(target_severity IN ('Critical', 'Moderate', 'Stable')),
                priority_order INTEGER DEFAULT 0,
                is_active BOOLEAN DEFAULT 1,
                created_by INTEGER REFERENCES users(id),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS resources (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                resource_type TEXT NOT NULL CHECK(resource_type IN ('bed', 'staff', 'equipment')),
                resource_name TEXT NOT NULL,
                hospital_branch TEXT NOT NULL,
                total_capacity INTEGER NOT NULL,
                currently_used INTEGER DEFAULT 0,
                status TEXT DEFAULT 'available' CHECK(status IN ('available', 'occupied', 'maintenance')),
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS audit_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER REFERENCES users(id),
                action TEXT NOT NULL,
                entity_type TEXT,
                entity_id INTEGER,
                details TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS notifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER REFERENCES users(id),
                patient_id TEXT,
                message TEXT NOT NULL,
                severity TEXT NOT NULL CHECK(severity IN ('info', 'warning', 'critical')),
                is_read BOOLEAN DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                patient_id TEXT,
                assigned_to INTEGER REFERENCES users(id),
                title TEXT NOT NULL,
                description TEXT,
                status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'completed')),
                priority TEXT DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high', 'urgent')),
                due_date DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                completed_at DATETIME
            );

            CREATE INDEX IF NOT EXISTS idx_patients_patient_id ON patients(patient_id);
            CREATE INDEX IF NOT EXISTS idx_patients_record_date ON patients(record_date);
            CREATE INDEX IF NOT EXISTS idx_patients_priority ON patients(priority_group);
            CREATE INDEX IF NOT EXISTS idx_patients_doctor ON patients(doctor_assigned);
            CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
            CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON tasks(assigned_to);
            CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
        """)

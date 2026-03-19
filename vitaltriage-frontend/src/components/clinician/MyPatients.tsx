import { useState, useEffect } from "react";
import { api } from "../../lib/api";
import type { Patient, TriageResult } from "../../lib/api";
import { PriorityBadge } from "../PriorityBadge";
import { Stethoscope, Clock, AlertTriangle, ChevronRight, Zap } from "lucide-react";

interface MyPatientsProps {
  doctorName: string;
}

export function MyPatients({ doctorName }: MyPatientsProps) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [history, setHistory] = useState<Patient[]>([]);
  const [triageResult, setTriageResult] = useState<TriageResult | null>(null);

  useEffect(() => {
    api.getAssignedPatients(doctorName).then((d) => setPatients(d.patients));
  }, [doctorName]);

  const handleSelect = async (patient: Patient) => {
    setSelectedPatient(patient);
    setTriageResult(null);
    const data = await api.getPatientHistory(patient.patient_id);
    setHistory(data.history);
  };

  const handleTriage = async (patient: Patient) => {
    const result = await api.classify({
      patient_id: patient.patient_id,
      severity_score: patient.severity_score,
      treatment_urgency: patient.treatment_urgency,
      vital_risk_score: patient.vital_risk_score,
      icu_required: patient.icu_required,
    });
    setTriageResult(result);
  };

  return (
    <div className="flex gap-6 h-full">
      {/* Patient List */}
      <div className="w-96 space-y-3 shrink-0 overflow-auto">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">My Patients</h3>
          <p className="text-sm text-gray-500">{patients.length} patients assigned to {doctorName}</p>
        </div>
        {patients.map((p) => (
          <button key={p.patient_id} onClick={() => handleSelect(p)}
            className={`w-full text-left bg-white rounded-xl border p-4 hover:border-blue-300 transition-colors ${
              selectedPatient?.patient_id === p.patient_id ? "border-blue-500 ring-2 ring-blue-100" : ""
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono font-semibold text-blue-600 text-sm">{p.patient_id}</span>
              <PriorityBadge priority={p.priority_group} size="sm" />
            </div>
            <p className="text-sm font-medium text-gray-800">{p.primary_condition}</p>
            <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
              <span>Age: {p.age}</span>
              <span>{p.gender}</span>
              <span>Severity: {p.severity_score}</span>
              <ChevronRight className="w-4 h-4 ml-auto text-gray-300" />
            </div>
          </button>
        ))}
        {patients.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <Stethoscope className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No patients assigned</p>
          </div>
        )}
      </div>

      {/* Patient Detail */}
      <div className="flex-1 min-w-0">
        {selectedPatient ? (
          <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-xl border p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-gray-800">{selectedPatient.patient_id}</h3>
                  <p className="text-gray-500">{selectedPatient.primary_condition}</p>
                </div>
                <div className="flex items-center gap-3">
                  <PriorityBadge priority={selectedPatient.priority_group} size="lg" />
                  <button onClick={() => handleTriage(selectedPatient)}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium">
                    <Zap className="w-4 h-4" /> Run Triage
                  </button>
                </div>
              </div>

              {triageResult && (
                <div className={`rounded-lg p-4 mb-4 ${
                  triageResult.priority_group === "Critical" ? "bg-red-50 border border-red-200" :
                  triageResult.priority_group === "Moderate" ? "bg-amber-50 border border-amber-200" :
                  "bg-green-50 border border-green-200"
                }`}>
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="font-semibold text-sm">Triage Recommendation</span>
                  </div>
                  <p className="text-sm">Classification: <strong>{triageResult.priority_group}</strong></p>
                  <p className="text-xs text-gray-600 mt-1">{triageResult.reasoning}</p>
                </div>
              )}

              <div className="grid grid-cols-4 gap-4">
                {[
                  { label: "Age", value: selectedPatient.age },
                  { label: "Gender", value: selectedPatient.gender },
                  { label: "Severity", value: selectedPatient.severity_score },
                  { label: "Urgency", value: selectedPatient.treatment_urgency },
                  { label: "Vital Risk", value: selectedPatient.vital_risk_score },
                  { label: "Comorbidities", value: selectedPatient.comorbidity_count },
                  { label: "Readmission Risk", value: selectedPatient.readmission_risk },
                  { label: "Adherence", value: `${selectedPatient.medication_adherence}%` },
                  { label: "ICU Required", value: selectedPatient.icu_required },
                  { label: "Bed Required", value: selectedPatient.bed_required },
                  { label: "Follow-up", value: selectedPatient.follow_up_required },
                  { label: "Insurance", value: selectedPatient.insurance_type },
                  { label: "Region", value: selectedPatient.region },
                  { label: "Branch", value: selectedPatient.hospital_branch },
                  { label: "Status", value: selectedPatient.appointment_status },
                  { label: "Lab Pending", value: selectedPatient.lab_test_pending },
                ].map((item) => (
                  <div key={item.label} className="text-sm">
                    <p className="text-gray-500 text-xs">{item.label}</p>
                    <p className="font-medium text-gray-800">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Timeline */}
            <div className="bg-white rounded-xl border p-6">
              <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4" /> Patient Timeline
              </h4>
              <div className="space-y-3">
                {history.map((h, i) => (
                  <div key={h.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-3 h-3 rounded-full ${
                        h.priority_group === "Critical" ? "bg-red-500" :
                        h.priority_group === "Moderate" ? "bg-amber-500" : "bg-green-500"
                      }`} />
                      {i < history.length - 1 && <div className="w-0.5 flex-1 bg-gray-200" />}
                    </div>
                    <div className="pb-4 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-800">{h.record_date}</span>
                        <PriorityBadge priority={h.priority_group} size="sm" />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Severity: {h.severity_score} | Risk: {h.vital_risk_score} | Urgency: {h.treatment_urgency}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center">
              <Stethoscope className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Select a patient to view details</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

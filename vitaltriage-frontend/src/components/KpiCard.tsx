import type { ReactNode } from "react";

interface KpiCardProps {
  label: string;
  value: number | string;
  icon: ReactNode;
  color: string;
  subtitle?: string;
}

const COLOR_MAP: Record<string, string> = {
  red: "bg-red-50 text-red-600 border-red-200",
  amber: "bg-amber-50 text-amber-600 border-amber-200",
  green: "bg-green-50 text-green-600 border-green-200",
  blue: "bg-blue-50 text-blue-600 border-blue-200",
  purple: "bg-purple-50 text-purple-600 border-purple-200",
  teal: "bg-teal-50 text-teal-600 border-teal-200",
  yellow: "bg-yellow-50 text-yellow-600 border-yellow-200",
};

const ICON_BG: Record<string, string> = {
  red: "bg-red-100",
  amber: "bg-amber-100",
  green: "bg-green-100",
  blue: "bg-blue-100",
  purple: "bg-purple-100",
  teal: "bg-teal-100",
  yellow: "bg-yellow-100",
};

export function KpiCard({ label, value, icon, color, subtitle }: KpiCardProps) {
  return (
    <div className={`rounded-xl border p-4 ${COLOR_MAP[color] || COLOR_MAP.blue}`}>
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${ICON_BG[color] || ICON_BG.blue}`}>
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs font-medium opacity-80">{label}</p>
          {subtitle && <p className="text-xs opacity-60">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}

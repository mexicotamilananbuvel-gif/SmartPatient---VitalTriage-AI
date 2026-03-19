interface PriorityBadgeProps {
  priority: string;
  size?: "sm" | "md" | "lg";
}

const COLORS: Record<string, string> = {
  Critical: "bg-red-100 text-red-700 border-red-200",
  Moderate: "bg-amber-100 text-amber-700 border-amber-200",
  Stable: "bg-green-100 text-green-700 border-green-200",
  urgent: "bg-red-100 text-red-700 border-red-200",
  high: "bg-orange-100 text-orange-700 border-orange-200",
  medium: "bg-yellow-100 text-yellow-700 border-yellow-200",
  low: "bg-gray-100 text-gray-700 border-gray-200",
  critical: "bg-red-100 text-red-700 border-red-200",
  warning: "bg-amber-100 text-amber-700 border-amber-200",
  info: "bg-blue-100 text-blue-700 border-blue-200",
  Yes: "bg-red-100 text-red-700 border-red-200",
  No: "bg-green-100 text-green-700 border-green-200",
  pending: "bg-gray-100 text-gray-700 border-gray-200",
  in_progress: "bg-blue-100 text-blue-700 border-blue-200",
  completed: "bg-green-100 text-green-700 border-green-200",
  available: "bg-green-100 text-green-700 border-green-200",
  occupied: "bg-red-100 text-red-700 border-red-200",
  maintenance: "bg-yellow-100 text-yellow-700 border-yellow-200",
};

const SIZES: Record<string, string> = {
  sm: "text-xs px-1.5 py-0.5",
  md: "text-xs px-2 py-1",
  lg: "text-sm px-3 py-1.5",
};

export function PriorityBadge({ priority, size = "md" }: PriorityBadgeProps) {
  const colorClass = COLORS[priority] || "bg-gray-100 text-gray-700 border-gray-200";
  return (
    <span className={`inline-flex items-center rounded-full border font-medium ${colorClass} ${SIZES[size]}`}>
      {priority}
    </span>
  );
}

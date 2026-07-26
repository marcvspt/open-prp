import type { ReactNode } from "react";

interface Props {
  label: string;
  value: string;
  colorClass?: string;
  sub?: ReactNode;
}

export default function StatCard({ label, value, colorClass = "text-string", sub }: Props) {
  return (
    <div className="bg-panel rounded-xl border border-border p-4 shadow-sm">
      <p className="text-xs text-string-muted uppercase tracking-wider">{label}</p>
      <p className={`text-xl font-bold mt-1 ${colorClass}`}>{value}</p>
      {sub}
    </div>
  );
}

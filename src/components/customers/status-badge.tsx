import { STATUS_META, type CustomerStatus } from "@/lib/constants";

export function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status as CustomerStatus] ?? { label: status, tone: "slate" };
  return <span className={`status-badge status-${meta.tone}`}>{meta.label}</span>;
}

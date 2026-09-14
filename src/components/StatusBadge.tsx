import { statusLabel, type LedgerTransaction } from "@/lib/dealit";

export function StatusBadge({ item }: { item: LedgerTransaction }) {
  const overdue = item.overdue;
  const tone = overdue
    ? "bg-overdue-soft text-overdue"
    : item.tx.status === "pending"
      ? "bg-waiting-soft text-waiting"
      : item.tx.status === "settled"
        ? "bg-receive-soft text-receive"
        : item.tx.status === "rejected" || item.tx.status === "disputed"
          ? "bg-overdue-soft text-overdue"
          : item.incoming
            ? "bg-receive-soft text-receive"
            : "bg-borrow-soft text-borrow";

  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${tone}`}>
      {overdue ? "Overdue" : statusLabel(item.tx.status)}
    </span>
  );
}

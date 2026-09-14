import { Link } from "@tanstack/react-router";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";

import { StatusBadge } from "@/components/StatusBadge";
import { formatAmount, initials, type LedgerTransaction } from "@/lib/dealit";

export function TransactionCard({ item }: { item: LedgerTransaction }) {
  return (
    <Link
      to="/transactions/$id"
      params={{ id: item.tx.id }}
      className="card-surface flex items-center gap-3 px-4 py-4 transition-transform active:scale-[0.99]"
    >
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
          item.incoming
            ? "bg-receive-soft text-receive"
            : "bg-borrow-soft text-borrow"
        }`}
      >
        {initials(item.counterpartyName)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{item.counterpartyName}</p>
        <div className="mt-1 flex items-center gap-2">
          <StatusBadge item={item} />
        </div>
      </div>
      <div className="text-right">
        <p
          className={`flex items-center justify-end gap-1 text-lg font-bold tabular-nums ${
            item.overdue ? "text-overdue" : item.incoming ? "text-receive" : "text-borrow"
          }`}
        >
          {item.incoming ? (
            <ArrowDownLeft className="h-4 w-4" />
          ) : (
            <ArrowUpRight className="h-4 w-4" />
          )}
          {formatAmount(item.remaining)}
        </p>
        <p className="text-xs text-muted-foreground">
          {item.incoming ? "to receive" : "to return"}
        </p>
      </div>
    </Link>
  );
}

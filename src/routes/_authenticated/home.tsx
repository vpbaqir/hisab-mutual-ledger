import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowDownLeft, ArrowUpRight, Clock, Plus, Wallet } from "lucide-react";

import { AppShell, EmptyState } from "@/components/AppShell";
import { TransactionCard } from "@/components/TransactionCard";
import { useLedger } from "@/lib/api";
import { useMyProfile } from "@/lib/auth";
import { formatAmount, type LedgerTransaction } from "@/lib/dealit";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({
    meta: [
      { title: "Your ledger — Dealit" },
      { name: "description", content: "See what you're owed, what you owe and what's waiting for confirmation." },
      { property: "og:title", content: "Your ledger — Dealit" },
      { property: "og:description", content: "Money to receive, money to return, pending requests and overdue records." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomePage,
});

function sum(items: LedgerTransaction[]) {
  return items.reduce((total, item) => total + item.remaining, 0);
}

function HomePage() {
  const { data, isLoading } = useLedger();
  const { data: profile } = useMyProfile();
  const items = data?.items ?? [];

  const live = items.filter((item) => item.tx.status === "active" || item.tx.status === "partial");
  const toReceive = live.filter((item) => item.incoming);
  const toReturn = live.filter((item) => !item.incoming);
  const pending = items.filter((item) => item.tx.status === "pending");
  const overdue = live.filter((item) => item.overdue);
  const recent = items
    .filter((item) => item.tx.status !== "rejected")
    .slice(0, 6);

  return (
    <AppShell
      title={profile?.full_name ? `Hi, ${profile.full_name.split(" ")[0]}` : "Dealit"}
      subtitle="Both agree. Both see the record."
    >
      <div className="grid grid-cols-2 gap-3">
        <SummaryCard
          label="Money to Receive"
          value={formatAmount(sum(toReceive))}
          count={toReceive.length}
          tone="receive"
          icon={<ArrowDownLeft className="h-4 w-4" />}
        />
        <SummaryCard
          label="Money to Return"
          value={formatAmount(sum(toReturn))}
          count={toReturn.length}
          tone="borrow"
          icon={<ArrowUpRight className="h-4 w-4" />}
        />
        <SummaryCard
          label="Pending Requests"
          value={String(pending.length)}
          count={pending.length}
          tone="waiting"
          icon={<Clock className="h-4 w-4" />}
        />
        <SummaryCard
          label="Overdue"
          value={formatAmount(sum(overdue))}
          count={overdue.length}
          tone="overdue"
          icon={<AlertTriangle className="h-4 w-4" />}
        />
      </div>

      <h2 className="mb-3 mt-7 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Recent transactions
      </h2>

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((key) => (
            <div key={key} className="card-surface h-20 animate-pulse" />
          ))}
        </div>
      ) : recent.length === 0 ? (
        <EmptyState
          icon={<Wallet className="h-7 w-7" />}
          title="No transactions yet"
          description="Record your first borrowing or lending."
        />
      ) : (
        <div className="space-y-3">
          {recent.map((item) => (
            <TransactionCard key={item.tx.id} item={item} />
          ))}
        </div>
      )}

      <Link
        to="/add"
        className="fixed bottom-24 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-lift transition-transform active:scale-95"
      >
        <Plus className="h-4 w-4" /> Add
      </Link>
    </AppShell>
  );
}

function SummaryCard({
  label,
  value,
  count,
  tone,
  icon,
}: {
  label: string;
  value: string;
  count: number;
  tone: "receive" | "borrow" | "waiting" | "overdue";
  icon: React.ReactNode;
}) {
  const tones = {
    receive: "bg-receive-soft text-receive",
    borrow: "bg-borrow-soft text-borrow",
    waiting: "bg-waiting-soft text-waiting",
    overdue: "bg-overdue-soft text-overdue",
  } as const;

  return (
    <div className="card-surface p-4">
      <div className={`flex h-8 w-8 items-center justify-center rounded-full ${tones[tone]}`}>
        {icon}
      </div>
      <p className="mt-3 text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-bold tabular-nums tracking-tight">{value}</p>
      <p className="text-xs text-muted-foreground">
        {count} {count === 1 ? "record" : "records"}
      </p>
    </div>
  );
}

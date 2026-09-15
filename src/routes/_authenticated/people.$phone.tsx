import { createFileRoute, useParams } from "@tanstack/react-router";
import { Users } from "lucide-react";

import { AppShell, EmptyState } from "@/components/AppShell";
import { TransactionCard } from "@/components/TransactionCard";
import { useLedger } from "@/lib/api";
import { formatAmount } from "@/lib/dealit";

export const Route = createFileRoute("/_authenticated/people/$phone")({
  head: () => ({
    meta: [
      { title: "Shared records — Dealit" },
      { name: "description", content: "All money records you share with this person, and your net balance." },
      { property: "og:title", content: "Shared records — Dealit" },
      { property: "og:description", content: "Every confirmed record between the two of you." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PersonPage,
});

function PersonPage() {
  const { phone } = useParams({ from: "/_authenticated/people/$phone" });
  const { data } = useLedger();
  const items = (data?.items ?? []).filter(
    (item) => (item.counterpartyPhone || item.counterpartyName) === phone && item.tx.status !== "rejected",
  );

  const net = items.reduce((total, item) => {
    const open = item.tx.status === "active" || item.tx.status === "partial";
    if (!open) return total;
    return total + (item.incoming ? item.remaining : -item.remaining);
  }, 0);

  const name = items[0]?.counterpartyName ?? "Person";

  return (
    <AppShell title={name} subtitle={phone} back="/people">
      <div className="card-surface p-5 text-center">
        <p className="text-xs font-medium text-muted-foreground">Net balance</p>
        <p
          className={`number-xl mt-1 ${
            net > 0 ? "text-receive" : net < 0 ? "text-borrow" : "text-muted-foreground"
          }`}
        >
          {net === 0 ? "All settled" : formatAmount(Math.abs(net))}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {net > 0 ? "they owe you" : net < 0 ? "you owe them" : "nothing outstanding"}
        </p>
      </div>

      <h2 className="mb-3 mt-6 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Shared transactions
      </h2>
      {items.length === 0 ? (
        <EmptyState icon={<Users className="h-7 w-7" />} title="Nothing shared yet" />
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <TransactionCard key={item.tx.id} item={item} />
          ))}
        </div>
      )}
    </AppShell>
  );
}

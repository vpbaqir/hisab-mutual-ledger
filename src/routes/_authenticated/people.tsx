import { createFileRoute, Link } from "@tanstack/react-router";
import { Users } from "lucide-react";

import { AppShell, EmptyState } from "@/components/AppShell";
import { useLedger } from "@/lib/api";
import { formatAmount, initials, type LedgerTransaction } from "@/lib/dealit";

export const Route = createFileRoute("/_authenticated/people")({
  head: () => ({
    meta: [
      { title: "People — Dealit" },
      { name: "description", content: "Every person you have lent to or borrowed from, with your net balance." },
      { property: "og:title", content: "People — Dealit" },
      { property: "og:description", content: "Net balance and shared history for each contact." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PeoplePage,
});

export function groupByPerson(items: LedgerTransaction[]) {
  const groups = new Map<string, { name: string; phone: string; net: number; count: number }>();
  for (const item of items) {
    if (item.tx.status === "rejected") continue;
    const key = item.counterpartyPhone || item.counterpartyName;
    const current =
      groups.get(key) ?? { name: item.counterpartyName, phone: item.counterpartyPhone, net: 0, count: 0 };
    const open = item.tx.status === "active" || item.tx.status === "partial";
    current.net += open ? (item.incoming ? item.remaining : -item.remaining) : 0;
    current.count += 1;
    groups.set(key, current);
  }
  return [...groups.entries()].map(([key, value]) => ({ key, ...value }));
}

function PeoplePage() {
  const { data } = useLedger();
  const people = groupByPerson(data?.items ?? []);

  return (
    <AppShell title="People" subtitle="Shared records by person">
      {people.length === 0 ? (
        <EmptyState
          icon={<Users className="h-7 w-7" />}
          title="No contacts yet"
          description="People appear here once you record something together."
        />
      ) : (
        <div className="space-y-3">
          {people.map((person) => (
            <Link
              key={person.key}
              to="/people/$phone"
              params={{ phone: person.key }}
              className="card-surface flex items-center gap-3 px-4 py-4"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-muted text-sm font-semibold">
                {initials(person.name)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{person.name}</p>
                <p className="text-xs text-muted-foreground">
                  {person.count} {person.count === 1 ? "transaction" : "transactions"}
                </p>
              </div>
              <p
                className={`text-base font-bold tabular-nums ${
                  person.net > 0 ? "text-receive" : person.net < 0 ? "text-borrow" : "text-muted-foreground"
                }`}
              >
                {person.net === 0 ? "Settled" : formatAmount(Math.abs(person.net))}
              </p>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}

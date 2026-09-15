import { createFileRoute } from "@tanstack/react-router";
import { Inbox } from "lucide-react";
import { toast } from "sonner";

import { AppShell, EmptyState } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useConfirmTransaction, useLedger, useRejectTransaction } from "@/lib/api";
import { formatAmount, initials, statusLabel, type LedgerTransaction } from "@/lib/dealit";

export const Route = createFileRoute("/_authenticated/requests")({
  head: () => ({
    meta: [
      { title: "Requests — Dealit" },
      { name: "description", content: "Confirm or reject the money records other people sent you." },
      { property: "og:title", content: "Requests — Dealit" },
      { property: "og:description", content: "Nothing counts until both people confirm it." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RequestsPage,
});

function RequestsPage() {
  const { data } = useLedger();
  const items = data?.items ?? [];
  const userId = data?.userId;

  const received = items.filter(
    (item) => item.tx.status === "pending" && item.tx.creator_id !== userId,
  );
  const sent = items.filter(
    (item) => item.tx.status === "pending" && item.tx.creator_id === userId,
  );

  return (
    <AppShell title="Requests" subtitle="Confirmations waiting on both sides">
      <Tabs defaultValue="received">
        <TabsList className="grid w-full grid-cols-2 rounded-xl">
          <TabsTrigger value="received" className="rounded-lg">
            Received
          </TabsTrigger>
          <TabsTrigger value="sent" className="rounded-lg">
            Sent
          </TabsTrigger>
        </TabsList>

        <TabsContent value="received" className="mt-4 space-y-3">
          {received.length === 0 ? (
            <EmptyState icon={<Inbox className="h-7 w-7" />} title="Nothing waiting" description="New requests from friends show up here." />
          ) : (
            received.map((item) => <RequestCard key={item.tx.id} item={item} actionable />)
          )}
        </TabsContent>

        <TabsContent value="sent" className="mt-4 space-y-3">
          {sent.length === 0 ? (
            <EmptyState icon={<Inbox className="h-7 w-7" />} title="Nothing waiting" description="Records you send for confirmation appear here." />
          ) : (
            sent.map((item) => <RequestCard key={item.tx.id} item={item} />)
          )}
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}

function RequestCard({ item, actionable }: { item: LedgerTransaction; actionable?: boolean }) {
  const confirm = useConfirmTransaction();
  const reject = useRejectTransaction();

  return (
    <div className="card-surface p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-muted text-sm font-semibold">
          {initials(item.counterpartyName)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{item.counterpartyName}</p>
          <p className="text-xs text-muted-foreground">
            {new Date(item.tx.created_at).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
            })}{" "}
            · {statusLabel(item.tx.status)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold tabular-nums">{formatAmount(Number(item.tx.amount))}</p>
          <p className="text-xs text-muted-foreground">
            {item.incoming ? "you gave" : "you borrowed"}
          </p>
        </div>
      </div>

      {item.tx.note ? (
        <p className="mt-3 rounded-xl bg-muted px-3 py-2 text-sm text-muted-foreground">{item.tx.note}</p>
      ) : null}

      {actionable ? (
        <div className="mt-4 flex gap-3">
          <Button
            className="h-11 flex-1 rounded-xl"
            disabled={confirm.isPending}
            onClick={() =>
              confirm.mutate(item, {
                onError: (error) => toast.error(error.message),
              })
            }
          >
            Confirm
          </Button>
          <Button
            variant="outline"
            className="h-11 flex-1 rounded-xl"
            disabled={reject.isPending}
            onClick={() =>
              reject.mutate(item, {
                onError: (error) => toast.error(error.message),
              })
            }
          >
            Reject
          </Button>
        </div>
      ) : null}
    </div>
  );
}

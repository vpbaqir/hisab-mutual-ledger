import { createFileRoute, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { Check, CircleDot, HandCoins, Share2 } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useConfirmRepayment,
  useConfirmTransaction,
  useLedger,
  useRecordReturn,
  useRejectRepayment,
} from "@/lib/api";
import { useMyProfile } from "@/lib/auth";
import { formatAmount, initials, whatsappMessage, type LedgerTransaction, type Repayment } from "@/lib/dealit";

export const Route = createFileRoute("/_authenticated/transactions/$id")({
  head: () => ({
    meta: [
      { title: "Transaction details — Dealit" },
      { name: "description", content: "Original amount, returned amount, remaining balance and the full confirmation timeline." },
      { property: "og:title", content: "Transaction details — Dealit" },
      { property: "og:description", content: "Every step of this record, confirmed by both people." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TransactionPage,
});

function TransactionPage() {
  const { id } = useParams({ from: "/_authenticated/transactions/$id" });
  const { data } = useLedger();
  const item = (data?.items ?? []).find((entry) => entry.tx.id === id);
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const recordReturn = useRecordReturn();
  const confirmRepayment = useConfirmRepayment();
  const rejectRepayment = useRejectRepayment();
  const confirmTransaction = useConfirmTransaction();
  const { data: profile } = useMyProfile();
  const myId = data?.userId;

  function remind() {
    if (!item) return;
    const link = `${window.location.origin}/t/${item.tx.invite_token}`;
    const text = whatsappMessage(profile?.full_name ?? "Someone", Number(item.tx.amount), link);
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  }

  if (!item) {
    return (
      <AppShell title="Transaction" back="/home">
        <p className="text-sm text-muted-foreground">This record is not available.</p>
      </AppShell>
    );
  }

  const isBorrower = !item.incoming;
  const canRecordReturn =
    isBorrower && (item.tx.status === "active" || item.tx.status === "partial") && item.remaining > 0;

  async function submitReturn() {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      toast.error("Enter an amount");
      return;
    }
    if (!item) return;
    if (value > item.remaining) {
      toast.error(`You only owe ${formatAmount(item.remaining)}`);
      return;
    }
    await recordReturn.mutateAsync({ item, amount: value });
    setAmount("");
    setOpen(false);
  }

  return (
    <AppShell title={item.counterpartyName} back="/home">
      <div className="card-surface p-6 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted text-base font-semibold">
          {initials(item.counterpartyName)}
        </div>
        <p className={`number-xl mt-4 ${item.incoming ? "text-receive" : "text-borrow"}`}>
          {formatAmount(item.remaining)}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {item.incoming ? "to receive" : "to return"}
        </p>
        <div className="mt-3 flex justify-center">
          <StatusBadge item={item} />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Fact label="Original amount" value={formatAmount(Number(item.tx.amount))} />
        <Fact label="Returned" value={formatAmount(item.repaid)} />
        <Fact label="Remaining" value={formatAmount(item.remaining)} />
        <Fact
          label="Due date"
          value={
            item.tx.due_date
              ? new Date(item.tx.due_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
              : "—"
          }
        />
      </div>

      <div className="card-surface mt-4 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Confirmation
        </p>
        <div className="mt-3 space-y-2 text-sm">
          <ConfirmRow label="You" confirmed={item.confirmedByMe} />
          <ConfirmRow label={item.counterpartyName} confirmed={item.confirmedByOther} />
        </div>
        {item.awaitingMyConfirmation ? (
          <Button
            className="mt-4 h-11 w-full rounded-xl"
            onClick={() => confirmTransaction.mutate(item)}
            disabled={confirmTransaction.isPending}
          >
            Confirm this transaction
          </Button>
        ) : null}
      </div>

      {item.tx.status === "pending" && item.tx.creator_id === myId ? (
        <Button variant="outline" className="mt-4 h-11 w-full rounded-xl text-sm" onClick={remind}>
          <Share2 className="mr-2 h-4 w-4" /> Remind on WhatsApp (optional)
        </Button>
      ) : null}

      <div className="card-surface mt-4 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Timeline</p>
        <div className="mt-3 space-y-4">
          <TimelineRow
            title="Transaction created"
            detail={new Date(item.tx.created_at).toLocaleString("en-IN")}
            done
          />
          <TimelineRow
            title="Confirmed by both"
            detail={item.tx.activated_at ? new Date(item.tx.activated_at).toLocaleString("en-IN") : "Waiting"}
            done={!!item.tx.activated_at}
          />
          {item.repayments.map((repayment) => (
            <TimelineRow
              key={repayment.id}
              title={`Return of ${formatAmount(Number(repayment.amount))}`}
              detail={
                repayment.status === "confirmed"
                  ? `Confirmed ${new Date(repayment.confirmed_at ?? repayment.created_at).toLocaleDateString("en-IN")}`
                  : repayment.status === "rejected"
                    ? "Rejected"
                    : "Waiting for confirmation"
              }
              done={repayment.status === "confirmed"}
            />
          ))}
          <TimelineRow
            title="Settlement"
            detail={item.tx.settled_at ? new Date(item.tx.settled_at).toLocaleString("en-IN") : "Not settled yet"}
            done={item.tx.status === "settled"}
          />
        </div>
      </div>

      {item.incoming && item.pendingRepayments.length > 0 ? (
        <div className="card-surface mt-4 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Returns awaiting your confirmation
          </p>
          {item.pendingRepayments.map((repayment: Repayment) => (
            <div key={repayment.id} className="mt-3 flex items-center gap-3">
              <p className="flex-1 font-semibold tabular-nums">
                {formatAmount(Number(repayment.amount))}
              </p>
              <Button
                size="sm"
                className="rounded-xl"
                onClick={() => confirmRepayment.mutate({ item, repayment })}
                disabled={confirmRepayment.isPending}
              >
                Confirm
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="rounded-xl"
                onClick={() => rejectRepayment.mutate(repayment)}
              >
                Reject
              </Button>
            </div>
          ))}
        </div>
      ) : null}

      {canRecordReturn ? (
        <Button className="mt-5 h-14 w-full rounded-2xl text-base" onClick={() => setOpen(true)}>
          <HandCoins className="mr-2 h-4 w-4" /> Record Return
        </Button>
      ) : null}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Record a return</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="return-amount">Amount</Label>
            <Input
              id="return-amount"
              inputMode="numeric"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder={String(item.remaining)}
              className="number-xl h-16"
            />
            <p className="text-xs text-muted-foreground">
              Today · {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
            </p>
          </div>
          <DialogFooter>
            <Button
              className="h-12 w-full rounded-xl"
              onClick={submitReturn}
              disabled={recordReturn.isPending}
            >
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="card-surface p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-bold tabular-nums">{value}</p>
    </div>
  );
}

function ConfirmRow({ label, confirmed }: { label: string; confirmed: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`flex h-6 w-6 items-center justify-center rounded-full ${
          confirmed ? "bg-receive-soft text-receive" : "bg-waiting-soft text-waiting"
        }`}
      >
        {confirmed ? <Check className="h-3.5 w-3.5" /> : <CircleDot className="h-3.5 w-3.5" />}
      </span>
      <span className="flex-1 truncate">{label}</span>
      <span className="text-xs text-muted-foreground">{confirmed ? "Confirmed" : "Waiting"}</span>
    </div>
  );
}

function TimelineRow({
  title,
  detail,
  done,
}: {
  title: string;
  detail: string;
  done?: boolean;
}) {
  return (
    <div className="flex gap-3">
      <span
        className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${done ? "bg-receive" : "bg-border"}`}
      />
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{detail}</p>
      </div>
    </div>
  );
}

export type { LedgerTransaction };

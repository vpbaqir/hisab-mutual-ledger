import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Share2 } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCreateTransaction } from "@/lib/api";
import { useMyProfile } from "@/lib/auth";
import { isValidPhone, whatsappMessage } from "@/lib/dealit";

export const Route = createFileRoute("/_authenticated/add")({
  head: () => ({
    meta: [
      { title: "Add a transaction — Dealit" },
      { name: "description", content: "Record money you gave or borrowed and send it to the other person for confirmation." },
      { property: "og:title", content: "Add a transaction — Dealit" },
      { property: "og:description", content: "A record becomes real only when both people confirm it." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AddPage,
});

function AddPage() {
  const navigate = useNavigate();
  const createTransaction = useCreateTransaction();
  const { data: profile } = useMyProfile();
  const [direction, setDirection] = useState<"gave" | "borrowed">("gave");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [note, setNote] = useState("");
  const [invite, setInvite] = useState<{ name: string; amount: number; link: string } | null>(null);

  async function submit() {
    const value = Number(amount);
    if (name.trim().length < 2) {
      toast.error("Add the other person's name");
      return;
    }
    if (!isValidPhone(phone)) {
      toast.error("Add a valid 10-digit phone number");
      return;
    }
    if (!Number.isFinite(value) || value <= 0) {
      toast.error("Enter an amount");
      return;
    }

    try {
      const created = await createTransaction.mutateAsync({
        direction,
        name: name.trim(),
        phone,
        amount: value,
        dueDate: dueDate || null,
        note: note.trim() || null,
      });

      const matched = Boolean(direction === "gave" ? created.borrower_id : created.lender_id);
      if (matched) {
        toast.success(`Sent — ${name.trim()} will see it in their Requests`);
        void navigate({ to: "/requests" });
      } else {
        setInvite({
          name: name.trim(),
          amount: value,
          link: `${window.location.origin}/t/${created.invite_token}`,
        });
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save this record");
    }
  }

  return (
    <AppShell title="Add" subtitle="What happened?" back="/home">
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setDirection("gave")}
          className={`card-surface flex flex-col items-start gap-2 p-4 text-left transition-all ${
            direction === "gave" ? "ring-2 ring-receive" : "opacity-70"
          }`}
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-receive-soft text-receive">
            <ArrowDownLeft className="h-4 w-4" />
          </span>
          <span className="text-sm font-semibold">I Gave Money</span>
        </button>
        <button
          onClick={() => setDirection("borrowed")}
          className={`card-surface flex flex-col items-start gap-2 p-4 text-left transition-all ${
            direction === "borrowed" ? "ring-2 ring-borrow" : "opacity-70"
          }`}
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-borrow-soft text-borrow">
            <ArrowUpRight className="h-4 w-4" />
          </span>
          <span className="text-sm font-semibold">I Borrowed Money</span>
        </button>
      </div>

      <div className="card-surface mt-4 space-y-4 p-5">
        <div className="space-y-2">
          <Label htmlFor="name">Other person's name</Label>
          <Input id="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Ahmed" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone number</Label>
          <Input
            id="phone"
            inputMode="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="98765 43210"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="amount">Amount</Label>
          <Input
            id="amount"
            inputMode="numeric"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="500"
            className="number-xl h-16"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="due">Due date</Label>
          <Input id="due" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="note">Note (optional)</Label>
          <Textarea id="note" value={note} onChange={(event) => setNote(event.target.value)} rows={2} />
        </div>
      </div>

      <Button
        className="mt-5 h-14 w-full rounded-2xl text-base"
        onClick={submit}
        disabled={createTransaction.isPending}
      >
        <Share2 className="mr-2 h-4 w-4" />
        {createTransaction.isPending ? "Sending…" : "Send for Confirmation"}
      </Button>
      <p className="mt-3 text-center text-xs text-muted-foreground">
        The other person gets a request right inside Dealit — no WhatsApp needed. Sharing a link is
        only needed if they don't use Dealit yet.
      </p>

      <Dialog open={!!invite} onOpenChange={(open) => !open && setInvite(null)}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Invite {invite?.name} to Dealit</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {invite?.name} isn't on Dealit yet, so the request is waiting for them. They can confirm
            it here once they join — or share the secure link so they can open it right away. The
            amount and phone number are never put in the link.
          </p>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              className="h-12 w-full rounded-xl"
              onClick={() => {
                if (!invite) return;
                const text = whatsappMessage(
                  profile?.full_name ?? "Someone",
                  invite.amount,
                  invite.link,
                );
                window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
              }}
            >
              <Share2 className="mr-2 h-4 w-4" /> Share on WhatsApp (optional)
            </Button>
            <Button
              className="h-12 w-full rounded-xl"
              onClick={() => {
                setInvite(null);
                toast.success("Sent for confirmation");
                void navigate({ to: "/requests" });
              }}
            >
              Done — I'll tell them later
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

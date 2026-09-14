import type { Database } from "@/integrations/supabase/types";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Transaction = Database["public"]["Tables"]["transactions"]["Row"];
export type Repayment = Database["public"]["Tables"]["repayments"]["Row"];
export type Confirmation = Database["public"]["Tables"]["confirmations"]["Row"];
export type TransactionStatus = Database["public"]["Enums"]["transaction_status"];

export type Role = "lender" | "borrower";

export type LedgerTransaction = {
  tx: Transaction;
  role: Role;
  /** true when the signed-in user should receive this money back */
  incoming: boolean;
  counterpartyName: string;
  counterpartyPhone: string;
  counterpartyId: string | null;
  repaid: number;
  remaining: number;
  repayments: Repayment[];
  pendingRepayments: Repayment[];
  confirmations: Confirmation[];
  confirmedByMe: boolean;
  confirmedByOther: boolean;
  overdue: boolean;
  awaitingMyConfirmation: boolean;
};

export function formatAmount(value: number): string {
  return "₹" + Number(value).toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

export function normalizePhone(input: string): string {
  const digits = input.replace(/[^\d]/g, "");
  const last10 = digits.slice(-10);
  return "+91" + last10;
}

export function isValidPhone(input: string): boolean {
  return input.replace(/[^\d]/g, "").length >= 10;
}

export function statusLabel(status: TransactionStatus): string {
  switch (status) {
    case "pending":
      return "Waiting for confirmation";
    case "active":
      return "Active";
    case "partial":
      return "Partly returned";
    case "settled":
      return "Settled";
    case "disputed":
      return "Disputed";
    case "rejected":
      return "Rejected";
  }
}

export function initials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

export function buildLedger(
  userId: string,
  transactions: Transaction[],
  repayments: Repayment[],
  confirmations: Confirmation[],
  profiles: Profile[],
): LedgerTransaction[] {
  const profileById = new Map(profiles.map((p) => [p.id, p]));
  const today = new Date().toISOString().slice(0, 10);

  return transactions.map((tx) => {
    const role: Role =
      tx.lender_id === userId
        ? "lender"
        : tx.borrower_id === userId
          ? "borrower"
          : tx.lender_id === null
            ? "lender"
            : "borrower";

    const counterpartyId = role === "lender" ? tx.borrower_id : tx.lender_id;
    const counterpartyProfile = counterpartyId ? profileById.get(counterpartyId) : undefined;
    const txRepayments = repayments.filter((r) => r.transaction_id === tx.id);
    const confirmedRepayments = txRepayments.filter((r) => r.status === "confirmed");
    const repaid = confirmedRepayments.reduce((sum, r) => sum + Number(r.amount), 0);
    const txConfirmations = confirmations.filter(
      (c) => c.transaction_id === tx.id && c.type === "create",
    );
    const confirmedByMe = txConfirmations.some((c) => c.user_id === userId && c.confirmed);
    const confirmedByOther = txConfirmations.some((c) => c.user_id !== userId && c.confirmed);

    return {
      tx,
      role,
      incoming: role === "lender",
      counterpartyName:
        counterpartyProfile?.full_name || tx.counterparty_name || "Unknown person",
      counterpartyPhone: counterpartyProfile?.phone || tx.counterparty_phone,
      counterpartyId: counterpartyId ?? null,
      repaid,
      remaining: Math.max(Number(tx.amount) - repaid, 0),
      repayments: txRepayments,
      pendingRepayments: txRepayments.filter((r) => r.status === "pending"),
      confirmations: txConfirmations,
      confirmedByMe,
      confirmedByOther,
      overdue:
        !!tx.due_date &&
        tx.due_date < today &&
        (tx.status === "active" || tx.status === "partial"),
      awaitingMyConfirmation: tx.status === "pending" && !confirmedByMe,
    };
  });
}

export function whatsappMessage(name: string, amount: number, link: string): string {
  return `${name} invited you to confirm a ${formatAmount(amount)} money transaction in Dealit. Open the secure link to review and confirm.\n${link}`;
}

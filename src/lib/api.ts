import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { supabase } from "@/integrations/supabase/client";
import {
  buildLedger,
  normalizePhone,
  type LedgerTransaction,
  type Profile,
  type Repayment,
  type Confirmation,
  type Transaction,
} from "@/lib/dealit";
import { notify } from "@/lib/notifications";

export type LedgerData = {
  userId: string;
  items: LedgerTransaction[];
  profiles: Profile[];
};

async function fetchLedger(): Promise<LedgerData | null> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return null;

  const [txs, reps, confs, profs] = await Promise.all([
    supabase.from("transactions").select("*").order("created_at", { ascending: false }),
    supabase.from("repayments").select("*").order("created_at", { ascending: false }),
    supabase.from("confirmations").select("*"),
    supabase.from("profiles").select("*"),
  ]);

  const error = txs.error || reps.error || confs.error || profs.error;
  if (error) throw error;

  return {
    userId: user.id,
    profiles: (profs.data ?? []) as Profile[],
    items: buildLedger(
      user.id,
      (txs.data ?? []) as Transaction[],
      (reps.data ?? []) as Repayment[],
      (confs.data ?? []) as Confirmation[],
      (profs.data ?? []) as Profile[],
    ),
  };
}

export function useLedger() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["ledger"], queryFn: fetchLedger });

  useEffect(() => {
    const channel = supabase
      .channel("dealit-ledger")
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, () => {
        void queryClient.invalidateQueries({ queryKey: ["ledger"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "repayments" }, () => {
        void queryClient.invalidateQueries({ queryKey: ["ledger"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "confirmations" }, () => {
        void queryClient.invalidateQueries({ queryKey: ["ledger"] });
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
}

export function useSaveProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { full_name: string; phone: string; avatar_url?: string | null }) => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase.from("profiles").upsert({
        id: user.id,
        full_name: input.full_name,
        phone: normalizePhone(input.phone),
        avatar_url: input.avatar_url ?? null,
      });
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["my-profile"] });
      void queryClient.invalidateQueries({ queryKey: ["ledger"] });
    },
  });
}

export type NewTransactionInput = {
  direction: "gave" | "borrowed";
  name: string;
  phone: string;
  amount: number;
  dueDate: string | null;
  note: string | null;
};

export function useCreateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: NewTransactionInput) => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) throw new Error("Not signed in");

      const phone = normalizePhone(input.phone);
      const { data: match } = await supabase
        .from("profiles")
        .select("id")
        .eq("phone", phone)
        .maybeSingle();
      const otherId = match?.id ?? null;

      const { data, error } = await supabase
        .from("transactions")
        .insert({
          creator_id: user.id,
          lender_id: input.direction === "gave" ? user.id : otherId,
          borrower_id: input.direction === "gave" ? otherId : user.id,
          counterparty_name: input.name,
          counterparty_phone: phone,
          amount: input.amount,
          note: input.note,
          due_date: input.dueDate,
          status: "pending",
        })
        .select("*")
        .single();
      if (error) throw error;

      await supabase.from("confirmations").insert({
        transaction_id: data.id,
        user_id: user.id,
        type: "create",
        confirmed: true,
        confirmed_at: new Date().toISOString(),
      });

      notify("request_created", `Sent a ${input.amount} request to ${input.name}`);
      return data as Transaction;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ledger"] }),
  });
}

export function useConfirmTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (item: LedgerTransaction) => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) throw new Error("Not signed in");

      const patch: Partial<Transaction> = {
        status: "active",
        activated_at: new Date().toISOString(),
      };
      if (!item.tx.lender_id) patch.lender_id = user.id;
      if (!item.tx.borrower_id) patch.borrower_id = user.id;

      const { error: confirmError } = await supabase.from("confirmations").insert({
        transaction_id: item.tx.id,
        user_id: user.id,
        type: "create",
        confirmed: true,
        confirmed_at: new Date().toISOString(),
      });
      if (confirmError) throw confirmError;

      const { error } = await supabase
        .from("transactions")
        .update(patch)
        .eq("id", item.tx.id);
      if (error) throw error;

      // Identity is locked at activation and never rewritten afterwards.
      const { data: profs } = await supabase
        .from("profiles")
        .select("*")
        .in("id", [patch.lender_id ?? item.tx.lender_id, patch.borrower_id ?? item.tx.borrower_id].filter(Boolean) as string[]);

      for (const profile of profs ?? []) {
        await supabase.from("identity_snapshots").upsert(
          {
            transaction_id: item.tx.id,
            user_id: profile.id,
            name_snapshot: profile.full_name,
            phone_snapshot: profile.phone,
            avatar_snapshot: profile.avatar_url,
          },
          { onConflict: "transaction_id,user_id", ignoreDuplicates: true },
        );
      }

      notify("transaction_confirmed", "Transaction confirmed by both people");
      return true;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ledger"] }),
  });
}

export function useRejectTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (item: LedgerTransaction) => {
      const { error } = await supabase
        .from("transactions")
        .update({ status: "rejected" })
        .eq("id", item.tx.id);
      if (error) throw error;
      return true;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ledger"] }),
  });
}

export function useRecordReturn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { item: LedgerTransaction; amount: number }) => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase.from("repayments").insert({
        transaction_id: input.item.tx.id,
        amount: input.amount,
        initiated_by: user.id,
        status: "pending",
      });
      if (error) throw error;
      notify("repayment_pending", "Return recorded — waiting for confirmation");
      return true;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ledger"] }),
  });
}

export function useConfirmRepayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { item: LedgerTransaction; repayment: Repayment }) => {
      const { error } = await supabase
        .from("repayments")
        .update({ status: "confirmed", confirmed_at: new Date().toISOString() })
        .eq("id", input.repayment.id);
      if (error) throw error;

      const repaid = input.item.repaid + Number(input.repayment.amount);
      const settled = repaid >= Number(input.item.tx.amount);
      const { error: txError } = await supabase
        .from("transactions")
        .update({
          status: settled ? "settled" : "partial",
          settled_at: settled ? new Date().toISOString() : null,
        })
        .eq("id", input.item.tx.id);
      if (txError) throw txError;

      notify(settled ? "settled" : "repayment_confirmed", settled ? "Fully settled" : "Return confirmed");
      return true;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ledger"] }),
  });
}

export function useRejectRepayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (repayment: Repayment) => {
      const { error } = await supabase
        .from("repayments")
        .update({ status: "rejected" })
        .eq("id", repayment.id);
      if (error) throw error;
      return true;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ledger"] }),
  });
}

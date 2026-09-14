import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { normalizePhone } from "@/lib/dealit";

/**
 * Phone-first sign in.
 *
 * Dealit identifies people by phone number. Until an SMS provider is connected
 * to the project, the verification code is generated and shown in-app instead
 * of being texted. Swap `requestCode` for supabase.auth.signInWithOtp({ phone })
 * and `verifyCode` for supabase.auth.verifyOtp once SMS delivery is live —
 * nothing else in the app depends on how the code is delivered.
 */

function syntheticEmail(phone: string): string {
  return `p${normalizePhone(phone).replace("+", "")}@dealit.app`;
}

async function derivedSecret(phone: string): Promise<string> {
  const data = new TextEncoder().encode(`dealit:v1:${normalizePhone(phone)}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function requestCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function signInWithPhone(phone: string) {
  const email = syntheticEmail(phone);
  const password = await derivedSecret(phone);

  const first = await supabase.auth.signInWithPassword({ email, password });
  if (!first.error) return first.data;

  const created = await supabase.auth.signUp({ email, password });
  if (created.error) throw created.error;
  if (!created.data.session) {
    const retry = await supabase.auth.signInWithPassword({ email, password });
    if (retry.error) throw retry.error;
    return retry.data;
  }
  return created.data;
}

export async function signOut() {
  await supabase.auth.signOut();
}

export function useSession() {
  return useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session ?? null;
    },
    staleTime: 30_000,
  });
}

export function useMyProfile() {
  return useQuery({
    queryKey: ["my-profile"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

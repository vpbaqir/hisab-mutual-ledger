import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useSaveProfile } from "@/lib/api";
import { requestCode, signInWithPhone } from "@/lib/auth";
import { isValidPhone, normalizePhone } from "@/lib/dealit";

export const Route = createFileRoute("/login")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in to Dealit" },
      {
        name: "description",
        content: "Sign in to Dealit with your phone number and a verification code. No passwords.",
      },
      { property: "og:title", content: "Sign in to Dealit" },
      {
        property: "og:description",
        content: "Phone number and a verification code — that's the whole sign in.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LoginPage,
});

type Step = "phone" | "code" | "name";

function LoginPage() {
  const navigate = useNavigate();
  const saveProfile = useSaveProfile();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [sentCode, setSentCode] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  function sendCode() {
    if (!isValidPhone(phone)) {
      toast.error("Enter a 10-digit mobile number");
      return;
    }
    const next = requestCode();
    setSentCode(next);
    setCode("");
    setStep("code");
  }

  async function verify() {
    if (code.trim() !== sentCode) {
      toast.error("That code doesn't match");
      return;
    }
    setBusy(true);
    try {
      await signInWithPhone(phone);
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("id", userId ?? "")
        .maybeSingle();
      if (profile?.full_name) {
        void navigate({ to: "/home", replace: true });
      } else {
        setStep("name");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not sign in");
    } finally {
      setBusy(false);
    }
  }

  async function finish() {
    if (name.trim().length < 2) {
      toast.error("Enter your name");
      return;
    }
    setBusy(true);
    try {
      await saveProfile.mutateAsync({ full_name: name.trim(), phone });
      void navigate({ to: "/home", replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save your profile");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col justify-center bg-background px-6 py-12">
      <div className="mx-auto w-full max-w-sm">
        <img
          src="/images/dealit-icon.png"
          alt="Dealit"
          width={64}
          height={64}
          className="h-16 w-16 rounded-2xl shadow-soft"
        />
        <h1 className="mt-6 text-2xl font-bold tracking-tight">Dealit</h1>
        <p className="mt-1 text-sm text-muted-foreground">Both agree. Both see the record.</p>

        <div className="card-surface mt-8 space-y-4 p-5">
          {step === "phone" ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone number</Label>
                <Input
                  id="phone"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="98765 43210"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                />
              </div>
              <Button className="h-12 w-full rounded-xl text-base" onClick={sendCode}>
                Continue
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                No password, no ID. Just your number.
              </p>
            </>
          ) : null}

          {step === "code" ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="code">Verification code</Label>
                <Input
                  id="code"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="6-digit code"
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                />
                <p className="rounded-xl bg-muted px-3 py-2 text-xs text-muted-foreground">
                  Your code is <span className="font-semibold text-foreground">{sentCode}</span>.
                  It is shown here because SMS delivery isn't connected yet.
                </p>
              </div>
              <Button
                className="h-12 w-full rounded-xl text-base"
                onClick={verify}
                disabled={busy}
              >
                {busy ? "Verifying…" : "Verify"}
              </Button>
              <button
                className="w-full text-center text-xs text-muted-foreground underline"
                onClick={() => setStep("phone")}
              >
                Change number ({normalizePhone(phone)})
              </button>
            </>
          ) : null}

          {step === "name" ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="name">Your name</Label>
                <Input
                  id="name"
                  placeholder="e.g. Baq"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  This is the name the other person sees on shared records.
                </p>
              </div>
              <Button className="h-12 w-full rounded-xl text-base" onClick={finish} disabled={busy}>
                {busy ? "Saving…" : "Start using Dealit"}
              </Button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

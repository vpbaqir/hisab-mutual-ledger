import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Download, Info, LogOut, Moon, Shield } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useLedger, useSaveProfile } from "@/lib/api";
import { signOut, useMyProfile } from "@/lib/auth";
import { notificationsEnabled, setNotificationsEnabled } from "@/lib/notifications";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Dealit" },
      { name: "description", content: "Manage your profile, notifications, appearance and your exported data." },
      { property: "og:title", content: "Settings — Dealit" },
      { property: "og:description", content: "Your profile, notifications and data controls." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: profile } = useMyProfile();
  const { data: ledger } = useLedger();
  const saveProfile = useSaveProfile();
  const [name, setName] = useState("");
  const [notifications, setNotifications] = useState(true);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setName(profile?.full_name ?? "");
  }, [profile?.full_name]);

  useEffect(() => {
    setNotifications(notificationsEnabled());
    const stored = window.localStorage.getItem("dealit:theme") === "dark";
    setDark(stored);
    document.documentElement.classList.toggle("dark", stored);
  }, []);

  function toggleDark(next: boolean) {
    setDark(next);
    window.localStorage.setItem("dealit:theme", next ? "dark" : "light");
    document.documentElement.classList.toggle("dark", next);
  }

  function exportData() {
    const payload = JSON.stringify(
      {
        exported_at: new Date().toISOString(),
        profile,
        transactions: ledger?.items.map((item) => ({
          ...item.tx,
          repaid: item.repaid,
          remaining: item.remaining,
          counterparty: item.counterpartyName,
        })),
      },
      null,
      2,
    );
    const url = URL.createObjectURL(new Blob([payload], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "dealit-data.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await signOut();
    void navigate({ to: "/login", replace: true });
  }

  return (
    <AppShell title="Settings">
      <div className="card-surface space-y-4 p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Profile</p>
        <div className="space-y-2">
          <Label htmlFor="settings-name">Name</Label>
          <Input id="settings-name" value={name} onChange={(event) => setName(event.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Phone</Label>
          <Input value={profile?.phone ?? ""} readOnly className="bg-muted" />
        </div>
        <Button
          className="h-11 w-full rounded-xl"
          disabled={saveProfile.isPending || !profile}
          onClick={async () => {
            if (!profile) return;
            await saveProfile.mutateAsync({ full_name: name, phone: profile.phone });
            toast.success("Profile saved. Past records keep their original details.");
          }}
        >
          Save profile
        </Button>
        <p className="text-xs text-muted-foreground">
          Changing your name never changes records that are already confirmed.
        </p>
      </div>

      <div className="card-surface mt-4 divide-y divide-border">
        <Row icon={<Info className="h-4 w-4" />} label="Notifications">
          <Switch
            checked={notifications}
            onCheckedChange={(next) => {
              setNotifications(next);
              setNotificationsEnabled(next);
            }}
          />
        </Row>
        <Row icon={<Moon className="h-4 w-4" />} label="Dark mode">
          <Switch checked={dark} onCheckedChange={toggleDark} />
        </Row>
        <button className="flex w-full items-center gap-3 px-4 py-4 text-left" onClick={exportData}>
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Download className="h-4 w-4" />
          </span>
          <span className="flex-1 text-sm font-medium">Export data</span>
        </button>
        <Row icon={<Shield className="h-4 w-4" />} label="Privacy">
          <span className="text-xs text-muted-foreground">Only you and the other person</span>
        </Row>
        <Row icon={<Info className="h-4 w-4" />} label="About">
          <span className="text-xs text-muted-foreground">Dealit 1.0</span>
        </Row>
      </div>

      <Button
        variant="outline"
        className="mt-4 h-12 w-full rounded-xl text-destructive"
        onClick={handleSignOut}
      >
        <LogOut className="mr-2 h-4 w-4" /> Sign out
      </Button>
      <p className="mt-4 text-center text-xs text-muted-foreground">
        Signed in as {profile?.phone ?? "—"} ·{" "}
        {supabase ? "synced with your account" : ""}
      </p>
    </AppShell>
  );
}

function Row({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-4">
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground">
        {icon}
      </span>
      <span className="flex-1 text-sm font-medium">{label}</span>
      {children}
    </div>
  );
}

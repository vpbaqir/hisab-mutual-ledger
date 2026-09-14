import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Dealit — mutual debt tracker for friends & family" },
      {
        name: "description",
        content:
          "Dealit is a shared ledger for small borrowing and lending. Both people agree, both people see the record.",
      },
      { property: "og:title", content: "Dealit — both agree, both see the record" },
      {
        property: "og:description",
        content:
          "Track money lent and borrowed between friends and family. Every entry is confirmed by both people.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Splash,
});

function Splash() {
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      void navigate({ to: data.session ? "/home" : "/login", replace: true });
    }, 1100);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [navigate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-background px-8 text-center">
      <img
        src="/images/dealit-icon.png"
        alt="Dealit"
        width={96}
        height={96}
        className="h-24 w-24 rounded-3xl shadow-soft"
      />
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dealit</h1>
        <p className="mt-2 text-sm text-muted-foreground">Both agree. Both see the record.</p>
      </div>
    </div>
  );
}

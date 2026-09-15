import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/t/$token")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Review a shared record — Dealit" },
      { name: "description", content: "Open a secure Dealit invite to review and confirm a money record." },
      { property: "og:title", content: "Review a shared record — Dealit" },
      { property: "og:description", content: "Sign in with your phone number to review and confirm this record." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: InvitePage,
});

function InvitePage() {
  const { token } = useParams({ from: "/t/$token" });
  const navigate = useNavigate();
  const [message, setMessage] = useState("Opening your secure link…");

  useEffect(() => {
    void (async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        void navigate({ to: "/login", replace: true });
        return;
      }
      const { data } = await supabase
        .from("transactions")
        .select("id")
        .eq("invite_token", token)
        .maybeSingle();

      if (data?.id) {
        void navigate({ to: "/transactions/$id", params: { id: data.id }, replace: true });
      } else {
        setMessage("This link isn't for your phone number, or it has expired.");
      }
    })();
  }, [navigate, token]);

  return (
    <div className="flex min-h-screen items-center justify-center px-8 text-center">
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

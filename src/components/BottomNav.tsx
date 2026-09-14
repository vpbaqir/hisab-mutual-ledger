import { Link } from "@tanstack/react-router";
import { Home, Inbox, Users, Settings } from "lucide-react";

const items = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/requests", label: "Requests", icon: Inbox },
  { to: "/people", label: "People", icon: Users },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur">
      <div className="mx-auto flex max-w-md items-stretch justify-between px-2 pb-[env(safe-area-inset-bottom)]">
        {items.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium text-muted-foreground transition-colors"
            activeProps={{ className: "text-primary" }}
          >
            <Icon className="h-5 w-5" />
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}

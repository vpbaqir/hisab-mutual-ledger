import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";

import { BottomNav } from "@/components/BottomNav";

export function AppShell({
  title,
  subtitle,
  back,
  action,
  children,
  hideNav,
}: {
  title: string;
  subtitle?: string;
  back?: string;
  action?: ReactNode;
  children: ReactNode;
  hideNav?: boolean;
}) {
  return (
    <div className="min-h-screen bg-background pb-28">
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center gap-3 px-5 py-4">
          {back ? (
            <Link
              to={back}
              className="-ml-2 flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted"
              aria-label="Go back"
            >
              <ChevronLeft className="h-5 w-5" />
            </Link>
          ) : null}
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-semibold tracking-tight">{title}</h1>
            {subtitle ? (
              <p className="truncate text-sm text-muted-foreground">{subtitle}</p>
            ) : null}
          </div>
          {action}
        </div>
      </header>
      <main className="mx-auto w-full max-w-md px-5 py-5">{children}</main>
      {hideNav ? null : <BottomNav />}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
}) {
  return (
    <div className="card-surface flex flex-col items-center gap-3 px-6 py-12 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted text-muted-foreground">
        {icon}
      </div>
      <p className="text-base font-semibold">{title}</p>
      {description ? (
        <p className="max-w-[15rem] text-sm text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
}

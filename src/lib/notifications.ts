import { toast } from "sonner";

/**
 * Notification structure for Dealit.
 *
 * Every in-app event below is also the exact set of push notifications the app
 * will send once Firebase Cloud Messaging credentials are added: register a
 * messaging service worker, store the device token on the profile, and forward
 * these same event names from the server. Until then each event shows in-app.
 */
export type NotificationEvent =
  | "request_created"
  | "transaction_confirmed"
  | "repayment_pending"
  | "repayment_confirmed"
  | "due_tomorrow"
  | "overdue"
  | "settled";

const NOTIFICATIONS_ENABLED_KEY = "dealit:notifications";

export function notificationsEnabled(): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(NOTIFICATIONS_ENABLED_KEY) !== "off";
}

export function setNotificationsEnabled(enabled: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(NOTIFICATIONS_ENABLED_KEY, enabled ? "on" : "off");
}

export function notify(event: NotificationEvent, message: string) {
  if (!notificationsEnabled()) return;
  if (event === "overdue") toast.error(message);
  else toast.success(message);
}

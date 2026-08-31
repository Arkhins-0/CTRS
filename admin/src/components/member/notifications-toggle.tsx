"use client";

import { NotificationsToggle } from "@/components/notifications-toggle";

/** Push toggle bound to the member subscription store. */
export function MemberNotificationsToggle() {
  return <NotificationsToggle api="/api/member-push" />;
}

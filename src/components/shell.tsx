"use client";

import { createContext, useContext, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  MapPinned,
  Plus,
  Bookmark,
  Inbox,
  ClipboardList,
  Bell,
  UserRound,
  Waves,
} from "lucide-react";
import type {
  ApiEnvelope,
  SessionInfo,
  ListEnvelope,
  Notification,
} from "@/contracts";
import { usePoll } from "./api";

const SessionContext = createContext<{
  session: SessionInfo | null;
  refresh: () => Promise<void>;
}>({ session: null, refresh: async () => {} });
export const useSession = () => useContext(SessionContext);
export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const authority = pathname.startsWith("/authority");
  const { data, refresh } = usePoll<ApiEnvelope<SessionInfo>>("/session");
  const session = data?.data || null;
  const notifications = usePoll<ListEnvelope<Notification>>(
    session?.user ? "/notifications" : null,
  );
  const unread =
    notifications.data?.items.filter((item) => !item.readAt).length || 0;
  const links = authority
    ? [
        { href: "/authority", label: "Inbox", Icon: Inbox },
        { href: "/authority/work", label: "My work", Icon: ClipboardList },
        { href: "/authority/updates", label: "Updates", Icon: Bell },
      ]
    : [
        { href: "/public", label: "Nearby", Icon: MapPinned },
        { href: "/public/report", label: "Report", Icon: Plus },
        { href: "/public/following", label: "Following", Icon: Bookmark },
      ];
  return (
    <SessionContext.Provider value={{ session, refresh }}>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="app-header">
        <Link href={authority ? "/authority" : "/public"} className="brand">
          <Waves size={27} />
          <span>OpenHFX</span>
          {authority && (
            <span className="workspace-label">Response workspace</span>
          )}
        </Link>
        <div className="header-actions">
          <span className="demo-label">Local demo</span>
          <Link
            className="account-link"
            aria-label={
              session?.user ? `Account: ${session.user.displayName}` : "Sign in"
            }
            href={`/demo/sign-in?next=${encodeURIComponent(pathname)}`}
          >
            <UserRound size={20} />
            <span>{session?.user?.displayName || "Sign in"}</span>
          </Link>
        </div>
      </header>
      <main id="main">{children}</main>
      <nav
        className="bottom-nav"
        aria-label={authority ? "Authority navigation" : "Public navigation"}
      >
        {links.map(({ href, label, Icon }) => (
          <Link
            key={href}
            href={href}
            className={pathname === href ? "active" : ""}
            aria-current={pathname === href ? "page" : undefined}
          >
            <Icon size={22} />
            <span>
              {label}
              {unread > 0 && (label === "Following" || label === "Updates") && (
                <span
                  className="unread-count"
                  aria-label={`${unread} unread updates`}
                >
                  {unread}
                </span>
              )}
            </span>
          </Link>
        ))}
      </nav>
    </SessionContext.Provider>
  );
}
export function SignInRequired({ authority = false }: { authority?: boolean }) {
  const pathname = usePathname();
  return (
    <div className="empty-state">
      <h2>
        {authority ? "Your response workspace" : "Keep the response close"}
      </h2>
      <p>
        {authority
          ? "Use a provisioned local demo account to coordinate an organization or update your assigned work."
          : "Sign in to follow issues, add evidence, and see your updates."}
      </p>
      <Link
        className="button"
        href={`${authority ? "/authority/sign-in" : "/demo/sign-in"}?next=${encodeURIComponent(pathname)}`}
      >
        Choose a demo account
      </Link>
    </div>
  );
}

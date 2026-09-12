"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LogIn, LogOut } from "lucide-react";
import type { ListEnvelope, Organization, SessionInfo } from "@/contracts";
import { useSession } from "@/components/shell";
import { errorMessage, mutate, request, usePoll } from "@/components/api";
import { ErrorNotice, Notice } from "@/components/ui";

export function SignIn({ authority = false }: { authority?: boolean }) {
  const { session, refresh } = useSession();
  const organizations = usePoll<ListEnvelope<Organization>>("/organizations");
  const router = useRouter();
  const [next, setNext] = useState(authority ? "/authority" : "/public");
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get("next");
    if (value?.startsWith("/") && !value.startsWith("//")) setNext(value);
  }, []);
  async function signIn(accountId: string) {
    setPending(accountId);
    setError(null);
    try {
      const result = await mutate<SessionInfo>("/session", { accountId });
      await refresh();
      router.push(
        result.user?.role === "worker" && next === "/authority"
          ? "/authority/work"
          : next,
      );
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setPending(null);
    }
  }
  async function signOut() {
    setPending("out");
    try {
      await request("/session", { method: "DELETE" });
      await refresh();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setPending(null);
    }
  }
  return (
    <div className="page narrow">
      <p className="muted">OpenHFX local prototype</p>
      <h1>{authority ? "Enter your workspace" : "Choose a demo account"}</h1>
      <p>
        Use a fictional account to try the shared response. Actions are saved
        locally and visible to other sessions.
      </p>
      <Notice>
        This is a local demo sign-in, with fictional residents and
        organizations. It does not connect to a municipal service.
      </Notice>
      <ErrorNotice message={error} />
      {!session && <p>Loading available accounts…</p>}
      {session && !session.demoMode && (
        <Notice>Demo sign-in is unavailable on this host.</Notice>
      )}
      <div className="account-list">
        {session?.accounts
          .filter((a) => !authority || a.role !== "resident")
          .map((account) => (
            <button
              className="account-option"
              key={account.id}
              disabled={pending !== null}
              onClick={() => signIn(account.id)}
            >
              <div>
                <strong>{account.displayName}</strong>
                <span className="meta">
                  {account.role === "resident"
                    ? "Resident"
                    : account.role === "worker"
                      ? "Field worker"
                      : "Coordinator"}
                  {account.organizationId &&
                    ` · ${organizations.data?.items.find((o) => o.id === account.organizationId)?.name || "Demo organization"}`}
                </span>
              </div>
              <LogIn size={20} />
              {pending === account.id && <span>Signing in…</span>}
            </button>
          ))}
      </div>
      {session?.user && (
        <button
          className="secondary full"
          onClick={signOut}
          disabled={pending !== null}
        >
          <LogOut size={18} />
          Sign out of {session.user.displayName}
        </button>
      )}
    </div>
  );
}

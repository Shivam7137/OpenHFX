"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ApiEnvelope, ApiFailure } from "@/contracts";

export class RequestError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/v1${path}`, {
    credentials: "same-origin",
    ...init,
    headers: {
      ...(init?.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...init?.headers,
    },
  });
  const json = await response.json();
  if (!response.ok) {
    const failure = json as ApiFailure;
    throw new RequestError(
      failure.error?.message ||
        "The request could not be completed. Please retry.",
      failure.error?.code || "REQUEST_FAILED",
      response.status,
    );
  }
  return json as T;
}
export async function mutate<T>(
  path: string,
  body: unknown,
  method = "POST",
  key?: string,
): Promise<T> {
  const result = await request<ApiEnvelope<T>>(path, {
    method,
    body: JSON.stringify(body),
    headers: key ? { "Idempotency-Key": key } : {},
  });
  return result.data;
}
export function errorMessage(error: unknown) {
  if (error instanceof RequestError && error.code === "VERSION_CONFLICT")
    return "This issue changed while you were editing. Your text is still here. Review the latest information, then retry.";
  return error instanceof Error
    ? error.message
    : "Your update was not saved. Your text is still here. Please retry.";
}
export function usePoll<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [syncedAt, setSyncedAt] = useState<number | null>(null);
  const [offline, setOffline] = useState(false);
  const busy = useRef(false);
  const generation = useRef(0);
  const refresh = useCallback(async () => {
    if (!path || busy.current) return;
    const current = generation.current;
    busy.current = true;
    try {
      const result = await request<T>(path);
      if (current === generation.current) {
        setData(result);
        setError(null);
        setSyncedAt(Date.now());
      }
    } catch (e) {
      if (current === generation.current) setError(errorMessage(e));
    } finally {
      busy.current = false;
    }
  }, [path]);
  useEffect(() => {
    generation.current++;
    busy.current = false;
    setData(null);
    setSyncedAt(null);
    setError(null);
    const tick = () => {
      setOffline(!navigator.onLine);
      if (document.visibilityState === "visible" && navigator.onLine)
        void refresh();
    };
    tick();
    const interval = setInterval(tick, 3000);
    window.addEventListener("online", tick);
    window.addEventListener("offline", tick);
    window.addEventListener("focus", tick);
    document.addEventListener("visibilitychange", tick);
    return () => {
      generation.current++;
      clearInterval(interval);
      window.removeEventListener("online", tick);
      window.removeEventListener("offline", tick);
      window.removeEventListener("focus", tick);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [refresh]);
  return { data, error, syncedAt, offline, refresh };
}
export function useDraft<T>(key: string, initial: T) {
  const [value, setValue] = useState(initial);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(key);
      if (saved) setValue(JSON.parse(saved));
    } catch {}
    setReady(true);
  }, [key]);
  useEffect(() => {
    if (ready) sessionStorage.setItem(key, JSON.stringify(value));
  }, [key, value, ready]);
  return [
    value,
    setValue,
    () => {
      sessionStorage.removeItem(key);
      setValue(initial);
    },
  ] as const;
}

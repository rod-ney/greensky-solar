import { useSyncExternalStore } from "react";

export type SessionUser = {
  name: string;
  email: string;
  role: string;
};

export const DEFAULT_SESSION_USER: SessionUser = {
  name: "User",
  email: "",
  role: "client",
};

let cachedSessionUser: SessionUser = DEFAULT_SESSION_USER;
let sessionFetchStarted = false;
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((fn) => fn());
}

async function fetchSession() {
  if (sessionFetchStarted) return;
  sessionFetchStarted = true;
  try {
    const res = await fetch("/api/auth/session", { cache: "no-store" });
    if (res.ok) {
      const data = (await res.json()) as { name?: string; email?: string; role?: string };
      cachedSessionUser = {
        name: data.name ?? "User",
        email: data.email ?? "",
        role: data.role ?? "client",
      };
    } else {
      cachedSessionUser = DEFAULT_SESSION_USER;
    }
  } catch {
    cachedSessionUser = DEFAULT_SESSION_USER;
  } finally {
    notifyListeners();
  }
}

/** For backward compatibility; prefers API session when available */
export function getSessionUser(): SessionUser {
  return cachedSessionUser;
}

export function getDisplayName(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "User";
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1]}`;
}

export function getInitials(name: string): string {
  const initials = getDisplayName(name)
    .split(" ")
    .map((part) => part[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return initials || "U";
}

function subscribeToSession(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  if (!sessionFetchStarted && typeof window !== "undefined") {
    void fetchSession();
  }
  return () => {
    listeners.delete(onStoreChange);
  };
}

function getClientSessionSnapshot(): SessionUser {
  if (typeof document === "undefined") {
    return DEFAULT_SESSION_USER;
  }
  if (!sessionFetchStarted) {
    void fetchSession();
  }
  return cachedSessionUser;
}

function getServerSessionSnapshot(): SessionUser {
  return DEFAULT_SESSION_USER;
}

export function useSessionUser(): SessionUser {
  return useSyncExternalStore(
    subscribeToSession,
    getClientSessionSnapshot,
    getServerSessionSnapshot
  );
}

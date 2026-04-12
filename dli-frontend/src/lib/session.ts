"use client";

import { useEffect, useState } from "react";

export function getStoredToken() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem("token");
}

export function clearStoredToken() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem("token");
}

export function useSessionToken() {
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    function syncToken() {
      setToken(getStoredToken());
      setReady(true);
    }

    syncToken();
    window.addEventListener("storage", syncToken);

    return () => {
      window.removeEventListener("storage", syncToken);
    };
  }, []);

  return { token, ready };
}

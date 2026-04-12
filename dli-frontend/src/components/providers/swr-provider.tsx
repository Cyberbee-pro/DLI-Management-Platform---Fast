"use client";

import type { ReactNode } from "react";
import { SWRConfig } from "swr";

import { UnauthorizedError } from "@/lib/api";

export function AppSWRProvider({ children }: { children: ReactNode }) {
  return (
    <SWRConfig
      value={{
        keepPreviousData: true,
        revalidateOnFocus: true,
        revalidateOnReconnect: true,
        dedupingInterval: 15_000,
        focusThrottleInterval: 15_000,
        errorRetryCount: 2,
        shouldRetryOnError: (error) => !(error instanceof UnauthorizedError),
      }}
    >
      {children}
    </SWRConfig>
  );
}

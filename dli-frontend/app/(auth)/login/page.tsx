"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Terminal } from "lucide-react";

import { API_BASE_URL } from "@/config/constants";

interface AuthApiResponse {
  success: boolean;
  message?: string;
  code?: string;
  data?: {
    token?: string;
  };
}

function buildLoginEndpoint() {
  const sanitizedBaseUrl = API_BASE_URL.replace(/\/$/, "");
  return sanitizedBaseUrl ? `${sanitizedBaseUrl}/auth/login` : "";
}

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const existingToken = window.localStorage.getItem("token");

    if (existingToken) {
      router.replace("/dashboard");
    }
  }, [router]);

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const loginEndpoint = buildLoginEndpoint();
    const email = identifier.trim();

    if (!loginEndpoint) {
      setError("NEXT_PUBLIC_API_URL is not configured.");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(loginEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const payload = (await response.json().catch(() => null)) as AuthApiResponse | null;

      if (!response.ok) {
        throw new Error(payload?.message ?? "Invalid credentials");
      }

      const token = payload?.data?.token;

      if (!token) {
        throw new Error("Login succeeded, but the backend did not return a token.");
      }

      window.localStorage.setItem("token", token);
      router.push("/dashboard");
    } catch (loginError) {
      setError(
        loginError instanceof Error
          ? loginError.message
          : "Unable to authenticate with the server.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950 p-4">
      <div className="w-full max-w-md rounded-lg border border-neutral-800 bg-neutral-900/50 p-8 shadow-2xl backdrop-blur-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 rounded-full bg-lime-500/10 p-3 text-lime-400">
            <Terminal size={28} />
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-white">F.A.S.T. DLI</h1>
          <p className="mt-2 text-sm text-neutral-400">
            Deep Leaarning Institute // Active Node
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-[0.24em] text-neutral-400">
              Email
            </label>
            <input
              type="email"
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              className="w-full rounded border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-white transition-colors focus:border-lime-500 focus:outline-none focus:ring-1 focus:ring-lime-500"
              placeholder="architect.member@srm.edu"
              autoComplete="email"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-[0.24em] text-neutral-400">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-white transition-colors focus:border-lime-500 focus:outline-none focus:ring-1 focus:ring-lime-500"
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded bg-lime-500 px-4 py-3 text-sm font-semibold text-neutral-950 transition-colors hover:bg-lime-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? "AUTHENTICATING..." : "AUTHENTICATE TERMINAL"}
          </button>

          {error ? (
            <p className="text-sm text-rose-400" role="alert">
              {error}
            </p>
          ) : null}
        </form>
      </div>
    </div>
  );
}

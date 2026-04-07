"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Terminal } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulating API Call to your Express backend
    try {
      /* const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });
      const data = await res.json();
      localStorage.setItem("token", data.token);
      */
      
      // Mocking the token set for now
      localStorage.setItem("token", "mock_jwt_token_for_testing");
      router.push("/dashboard");
    } catch (error) {
      console.error("Auth failed", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950 p-4">
      <div className="w-full max-w-md rounded-lg border border-neutral-800 bg-neutral-900/50 p-8 shadow-2xl backdrop-blur-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 rounded-full bg-lime-500/10 p-3 text-lime-400">
            <Terminal size={32} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">F.A.S.T. DLI</h1>
          <p className="text-sm text-neutral-400">Direct Liaison Interface // Active Node</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
              SRM Reg No / Email
            </label>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full rounded border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-white focus:border-lime-500 focus:outline-none focus:ring-1 focus:ring-lime-500 transition-colors"
              placeholder="e.g. AR-9924-X"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-white focus:border-lime-500 focus:outline-none focus:ring-1 focus:ring-lime-500 transition-colors"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded bg-lime-500 px-4 py-3 text-sm font-bold text-neutral-950 transition-colors hover:bg-lime-400 disabled:opacity-50"
          >
            {isLoading ? "AUTHENTICATING..." : "AUTHENTICATE TERMINAL"}
          </button>
        </form>
      </div>
    </div>
  );
}
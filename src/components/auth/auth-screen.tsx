"use client";

import { useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";

export function AuthScreen() {
  const { login } = useAuth();
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const ok = await login(value);
    setLoading(false);
    if (ok) {
      router.push("/");
    } else {
      setError("Incorrect password. Try again.");
      setValue("");
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: "#0a0a0f" }}
    >
      <div
        className="w-full max-w-sm rounded-2xl border p-8 space-y-6"
        style={{ backgroundColor: "#12121a", borderColor: "#2a2a3a" }}
      >
        {/* Logo / title */}
        <div className="text-center space-y-1">
          <h1 className="text-xl font-bold tracking-tight" style={{ color: "#f1f5f9" }}>
            Consello Dashboard
          </h1>
          <p className="text-sm" style={{ color: "#94a3b8" }}>
            Enter your password to continue
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium" style={{ color: "#94a3b8" }}>
              Password
            </label>
            <input
              type="password"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="••••••••"
              autoFocus
              required
              className="w-full rounded-lg px-3 py-2.5 text-sm outline-none transition-colors"
              style={{
                backgroundColor: "#0a0a0f",
                border: "1px solid #2a2a3a",
                color: "#f1f5f9",
              }}
              onFocus={(e) =>
                (e.currentTarget.style.borderColor = "#3b82f6")
              }
              onBlur={(e) =>
                (e.currentTarget.style.borderColor = "#2a2a3a")
              }
            />
          </div>

          {error && (
            <p className="text-xs" style={{ color: "#ef4444" }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !value}
            className="w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition-opacity disabled:opacity-50"
            style={{ backgroundColor: "#3b82f6", color: "#fff" }}
          >
            {loading ? "Verifying…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}

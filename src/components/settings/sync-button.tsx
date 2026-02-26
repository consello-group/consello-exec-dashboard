"use client";

import { useState } from "react";

interface SyncButtonProps {
  platform: string;
  label: string;
  action: () => Promise<{ success: boolean; recordCount?: number; error?: string }>;
  disabled?: boolean;
  accentColor?: string;
}

type SyncState = "idle" | "loading" | "success" | "error";

export function SyncButton({
  platform: _platform,
  label,
  action,
  disabled = false,
  accentColor = "#6366f1",
}: SyncButtonProps) {
  const [state, setState] = useState<SyncState>("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleSync() {
    setState("loading");
    setMessage(null);
    try {
      const result = await action();
      if (result.success) {
        setState("success");
        setMessage(result.recordCount != null ? `${result.recordCount} records synced` : "Sync complete");
      } else {
        setState("error");
        setMessage(result.error ?? "Sync failed");
      }
    } catch (err) {
      setState("error");
      setMessage(err instanceof Error ? err.message : "Network error");
    }
    setTimeout(() => {
      setState("idle");
      setMessage(null);
    }, 4000);
  }

  const isLoading = state === "loading";

  const buttonBg =
    state === "success"
      ? "#052e16"
      : state === "error"
      ? "#450a0a"
      : "#1a1a26";

  const buttonColor =
    state === "success"
      ? "#10a37f"
      : state === "error"
      ? "#ef4444"
      : disabled
      ? "#94a3b8"
      : accentColor;

  const buttonBorder =
    state === "success"
      ? "#10a37f"
      : state === "error"
      ? "#ef4444"
      : disabled
      ? "#2a2a3a"
      : accentColor;

  return (
    <div className="space-y-2">
      <button
        onClick={handleSync}
        disabled={disabled || isLoading}
        className="w-full rounded-lg px-4 py-2.5 text-sm font-medium transition-all flex items-center justify-center gap-2"
        style={{
          backgroundColor: buttonBg,
          color: buttonColor,
          border: `1px solid ${buttonBorder}`,
          cursor: disabled ? "not-allowed" : isLoading ? "wait" : "pointer",
          opacity: disabled ? 0.5 : 1,
        }}
      >
        {isLoading && (
          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {state === "success" && (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )}
        {state === "error" && (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        )}
        {isLoading
          ? `Syncing ${label}...`
          : state === "success"
          ? "Sync complete"
          : state === "error"
          ? "Sync failed"
          : `Sync ${label}`}
      </button>
      {message && (
        <p className="text-xs text-center" style={{ color: state === "error" ? "#ef4444" : "#10a37f" }}>
          {message}
        </p>
      )}
    </div>
  );
}

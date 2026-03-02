"use client";

import { useState } from "react";

const TERRACOTTA = "#A64A30";

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
  accentColor = TERRACOTTA,
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
    setTimeout(() => { setState("idle"); setMessage(null); }, 4000);
  }

  const isLoading = state === "loading";

  const bg    = state === "success" ? "#0d1a0d" : state === "error" ? "#1a0d0d" : "transparent";
  const color = state === "success" ? "#6fcf97"
              : state === "error"   ? "#ef4444"
              : disabled            ? "#3a3a3a"
              : accentColor;
  const border= state === "success" ? "#6fcf9733"
              : state === "error"   ? "#ef444433"
              : disabled            ? "#242424"
              : `${accentColor}66`;

  return (
    <div className="space-y-2">
      <button
        onClick={handleSync}
        disabled={disabled || isLoading}
        className="w-full px-4 py-2.5 text-sm font-medium transition-all flex items-center justify-center gap-2"
        style={{
          backgroundColor: bg,
          color,
          border: `1px solid ${border}`,
          borderRadius: "9999px",
          cursor: disabled ? "not-allowed" : isLoading ? "wait" : "pointer",
          opacity: disabled ? 0.4 : 1,
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
        {isLoading ? `Syncing ${label}...`
          : state === "success" ? "Sync complete"
          : state === "error"   ? "Sync failed"
          : `Sync ${label}`}
      </button>
      {message && (
        <p className="text-xs text-center" style={{ color: state === "error" ? "#ef4444" : "#6a6a6a" }}>
          {message}
        </p>
      )}
    </div>
  );
}

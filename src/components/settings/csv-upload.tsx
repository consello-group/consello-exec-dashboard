"use client";

import { useRef, useState } from "react";
import { importChatGPTCSV } from "@/app/(dashboard)/settings/actions";

type UploadState = "idle" | "loading" | "success" | "error";

const TERRACOTTA = "#A64A30";

export function ChatGPTCsvUpload() {
  const [files, setFiles] = useState<File[]>([]);
  const [state, setState] = useState<UploadState>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function addFiles(incoming: FileList | File[]) {
    const csvs = Array.from(incoming).filter((f) => f.name.endsWith(".csv"));
    if (!csvs.length) return;
    setFiles((prev) => {
      const names = new Set(prev.map((f) => f.name));
      return [...prev, ...csvs.filter((f) => !names.has(f.name))];
    });
  }

  function removeFile(name: string) {
    setFiles((prev) => prev.filter((f) => f.name !== name));
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function onDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    addFiles(e.dataTransfer.files);
  }

  async function handleImport() {
    if (!files.length) return;
    setState("loading");
    setMessage(null);

    try {
      const formData = new FormData();
      files.forEach((f) => formData.append("files", f));
      const result = await importChatGPTCSV(formData);

      if (result.success) {
        setState("success");
        const parts = [
          `${result.fileCount} file${result.fileCount === 1 ? "" : "s"}`,
          `${result.userCount} users`,
          `${result.recordCount} records`,
        ];
        setMessage(parts.join(" · "));
        setFiles([]);
      } else {
        setState("error");
        setMessage(result.error ?? "Import failed");
      }
    } catch (err) {
      setState("error");
      setMessage(err instanceof Error ? err.message : "Unexpected error");
    }

    setTimeout(() => {
      setState("idle");
      setMessage(null);
    }, 6000);
  }

  const isLoading = state === "loading";

  const zoneBorder = isDragging
    ? TERRACOTTA
    : state === "error"
    ? "#ef4444"
    : "#242424";

  const zoneBg = isDragging ? "#1a0d09" : "#111111";

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className="rounded-lg border-2 border-dashed p-6 text-center cursor-pointer transition-colors"
        style={{ borderColor: zoneBorder, backgroundColor: zoneBg }}
      >
        <svg
          className="mx-auto mb-2 h-7 w-7"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          style={{ color: isDragging ? TERRACOTTA : "#5a5a5a" }}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
          />
        </svg>
        <p className="text-sm font-medium" style={{ color: isDragging ? TERRACOTTA : "#e0e0e0" }}>
          {isDragging ? "Drop CSV files here" : "Drop CSV files here, or click to browse"}
        </p>
        <p className="text-xs mt-1" style={{ color: "#5a5a5a" }}>
          OpenAI monthly user report exports · Multiple files supported
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && addFiles(e.target.files)}
        />
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {files.map((f) => (
            <span
              key={f.name}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
              style={{ backgroundColor: "#1a1a1a", color: "#e0e0e0", border: "1px solid #242424" }}
            >
              {f.name}
              <button
                onClick={() => removeFile(f.name)}
                className="rounded-full p-0.5 transition-colors hover:text-red-400"
                style={{ color: "#5a5a5a" }}
                aria-label={`Remove ${f.name}`}
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Import button */}
      <button
        onClick={handleImport}
        disabled={!files.length || isLoading}
        className="w-full px-4 py-2.5 text-sm font-medium transition-all flex items-center justify-center gap-2"
        style={{
          borderRadius: "9999px",
          backgroundColor:
            state === "success" ? "#1a0d09" : state === "error" ? "#450a0a" : "transparent",
          color:
            state === "success"
              ? TERRACOTTA
              : state === "error"
              ? "#ef4444"
              : !files.length || isLoading
              ? "#5a5a5a"
              : TERRACOTTA,
          border: `1px solid ${
            state === "success" ? TERRACOTTA : state === "error" ? "#ef4444" : "#242424"
          }`,
          cursor: !files.length || isLoading ? "not-allowed" : "pointer",
          opacity: !files.length ? 0.5 : 1,
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
          ? `Importing ${files.length} file${files.length === 1 ? "" : "s"}...`
          : state === "success"
          ? "Import complete"
          : state === "error"
          ? "Import failed"
          : files.length
          ? `Import ${files.length} file${files.length === 1 ? "" : "s"}`
          : "Select files to import"}
      </button>

      {/* Result / error message */}
      {message && (
        <p className="text-xs text-center" style={{ color: state === "error" ? "#ef4444" : TERRACOTTA }}>
          {state === "success" ? `Imported: ${message}` : message}
        </p>
      )}
    </div>
  );
}

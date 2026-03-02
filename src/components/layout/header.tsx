"use client";

import { useEffect, useState } from "react";

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

export default function Header() {
  const [dateString, setDateString] = useState<string>("");

  useEffect(() => {
    setDateString(formatDate(new Date()));
  }, []);

  return (
    <header
      className="h-14 flex-shrink-0 flex items-center justify-between px-6"
      style={{ backgroundColor: "#000000", borderBottom: "1px solid #1e1e1e" }}
    >
      <span className="text-sm" style={{ color: "#3a3a3a" }}>{dateString}</span>
      <span className="text-xs font-bold tracking-widest uppercase text-white">
        Consello
      </span>
    </header>
  );
}

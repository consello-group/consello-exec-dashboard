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
      className="h-14 flex-shrink-0 flex items-center justify-between px-6 border-b border-[#2a2a3a] bg-[#0a0a0f]"
    >
      <span className="text-sm text-[#94a3b8]">{dateString}</span>
      <span className="text-xs font-semibold tracking-widest uppercase text-[#2a2a3a]">
        Consello
      </span>
    </header>
  );
}

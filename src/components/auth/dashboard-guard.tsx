"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export function DashboardGuard({ children }: { children: ReactNode }) {
  const { mounted, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!mounted) return;
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [mounted, isAuthenticated, router]);

  // Prevent flash of content before auth check completes
  if (!mounted || !isAuthenticated) return null;

  return <>{children}</>;
}

import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { DashboardGuard } from "@/components/auth/dashboard-guard";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardGuard>
      <div className="flex h-screen bg-[#0a0a0f] overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </div>
    </DashboardGuard>
  );
}

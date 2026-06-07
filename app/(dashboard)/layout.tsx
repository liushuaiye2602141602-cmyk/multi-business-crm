import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";

export default function DashboardGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <div className="ml-[260px]">
        <Header />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}

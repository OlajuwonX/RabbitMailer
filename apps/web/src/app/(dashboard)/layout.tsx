import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { Sidebar } from "@/components/ui/sidebar";
import { Header } from "@/components/ui/header";
import { AuthHydrator } from "@/components/auth/auth-hydrator";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="flex h-screen overflow-hidden">
      <AuthHydrator
        user={{
          id: user.id,
          name: user.name,
          email: user.email,
          isAdmin: user.isAdmin,
        }}
      />
      <Sidebar user={{ name: user.name, email: user.email }} />

      {/* Right column: header + scrollable content */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}

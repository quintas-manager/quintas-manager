import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { DashboardShell } from "@/components/layout/Sidebar";
import { FloatingActionButton } from "@/components/FloatingActionButton";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <DashboardShell
      userName={session.user.name ?? session.user.email ?? "Usuario"}
      userRole={session.user.role}
    >
      {children}
      <FloatingActionButton />
    </DashboardShell>
  );
}

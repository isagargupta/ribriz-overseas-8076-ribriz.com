import { getUser } from "@/lib/supabase/auth";
import { isAdminUser } from "@/lib/supabase/is-admin";
import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin/sidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();
  if (!user || !isAdminUser(user)) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen bg-[var(--color-surface)]">
      <AdminSidebar userEmail={user.email ?? ""} />
      <main className="flex-1 ml-60 min-h-screen">
        {children}
      </main>
    </div>
  );
}

import { Sidebar } from "@/components/layout/sidebar";
import { TopNav } from "@/components/layout/top-nav";
import { MobileNav } from "@/components/layout/mobile-nav";
import { OnboardingBanner } from "@/components/onboarding-banner";
import { getUser } from "@/lib/supabase/auth";
import { prisma } from "@/lib/db";
import { DashboardMain } from "@/components/layout/dashboard-main";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();

  const displayName =
    user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Student";
  const initials = displayName
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  let onboardingComplete = false;
  if (user) {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { onboardingComplete: true },
    });
    onboardingComplete = dbUser?.onboardingComplete ?? false;
  }

  return (
    <>
      <Sidebar
        userName={displayName}
        userInitials={initials}
        userEmail={user?.email || ""}
      />
      <DashboardMain>
        <TopNav userName={displayName} userInitials={initials} />
        {!onboardingComplete && <OnboardingBanner />}
        <MobileNav
          userName={displayName}
          userInitials={initials}
          userEmail={user?.email || ""}
        />
        {children}
      </DashboardMain>
    </>
  );
}

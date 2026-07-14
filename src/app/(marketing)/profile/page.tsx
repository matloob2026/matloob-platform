import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { AvatarUploader } from "@/components/media/AvatarUploader";
import { SiteHeader } from "@/components/layout/SiteHeader";

export const metadata: Metadata = {
  title: "الملف الشخصي | مطلوب",
};

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/profile");
  }

  const profile = await prisma.userProfile.findUnique({
    where: { userId: session.user.id },
    include: { avatar: true },
  });

  return (
    <main dir="rtl" className="min-h-screen bg-surface-muted px-4 py-10 sm:py-16">
      <SiteHeader />
      <Card className="mx-auto max-w-md text-center">
        <h1 className="font-display text-xl font-extrabold text-navy-950">الملف الشخصي</h1>
        <p className="mt-1 text-sm text-text-500">{profile?.displayName ?? session.user.email}</p>

        <div className="mt-6">
          <AvatarUploader initialAvatarUrl={profile?.avatar?.url} />
        </div>
      </Card>
    </main>
  );
}

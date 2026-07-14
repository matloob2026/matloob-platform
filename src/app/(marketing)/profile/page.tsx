import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth/auth";
import { profileService } from "@/services/profile.service";
import { getLocationOptions } from "@/lib/profile-location-options";
import { Card } from "@/components/ui/Card";
import { AvatarUploader } from "@/components/media/AvatarUploader";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { SiteHeader } from "@/components/layout/SiteHeader";

export const metadata: Metadata = {
  title: "الملف الشخصي | مطلوب",
};

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/profile");
  }

  const [profile, locationOptions] = await Promise.all([
    profileService.getProfile(session.user.id),
    getLocationOptions(),
  ]);

  return (
    <main dir="rtl" className="min-h-screen bg-surface-muted px-4 py-10 sm:py-16">
      <SiteHeader title="الملف الشخصي" />
      <Card className="mx-auto max-w-md">
        <div className="text-center">
          <h1 className="font-display text-xl font-extrabold text-navy-950">الملف الشخصي</h1>
          <p className="mt-1 text-sm text-text-500">{profile?.displayName ?? session.user.email}</p>
        </div>

        <div className="mt-6 flex justify-center">
          <AvatarUploader initialAvatarUrl={profile?.avatarUrl} />
        </div>

        <ProfileForm
          initialValues={{
            displayName: profile?.displayName ?? "",
            contactPhone: profile?.contactPhone ?? "",
            cityId: profile?.cityId ?? "",
            bio: profile?.bio ?? "",
            preferredContactMethod: profile?.preferredContactMethod ?? "",
          }}
          locationOptions={locationOptions}
        />
      </Card>
    </main>
  );
}

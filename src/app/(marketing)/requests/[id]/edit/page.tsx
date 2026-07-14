import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth/auth";
import { requestService } from "@/services/request.service";
import { RequestForm } from "@/components/requests/RequestForm";
import { getRequestFormOptions } from "@/lib/request-form-options";
import { SiteHeader } from "@/components/layout/SiteHeader";

export const metadata: Metadata = {
  title: "تعديل الطلب | مطلوب",
};

const EDITABLE_STATUSES = ["DRAFT", "PUBLISHED"];

export default async function EditRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=/requests/${id}/edit`);
  }

  const existing = await requestService.getById(id);
  if (!existing) notFound();

  // Same "don't reveal it exists" posture as the API layer — a
  // non-owner editing someone else's request just sees a 404, not 403.
  if (existing.owner.id !== session.user.id) notFound();

  if (!EDITABLE_STATUSES.includes(existing.status)) {
    redirect(`/requests/${id}`);
  }

  const options = await getRequestFormOptions();

  return (
    <main dir="rtl" className="min-h-screen bg-surface-muted px-4 py-10 sm:py-16">
      <SiteHeader />
      <div className="mx-auto mb-8 max-w-2xl text-center">
        <h1 className="font-display text-2xl font-extrabold text-navy-950 sm:text-3xl">
          تعديل الطلب
        </h1>
        <p className="mt-2 text-sm text-text-500">حدّث تفاصيل طلبك أدناه.</p>
      </div>
      <RequestForm
        mode="edit"
        requestId={id}
        options={options}
        initialValues={{
          categoryId: existing.category.id,
          countryId: existing.country.id,
          cityId: existing.city?.id ?? "",
          currencyId: "", // currency id isn't carried on RequestDetail (only code/symbol) — left blank; unchanged unless the buyer picks a new one
          title: existing.title,
          description: existing.description,
          budgetMin: existing.budgetMin?.toString() ?? "",
          budgetMax: existing.budgetMax?.toString() ?? "",
        }}
      />
    </main>
  );
}

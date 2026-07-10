import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth/auth";
import { RequestForm } from "@/components/requests/RequestForm";
import { getRequestFormOptions } from "@/lib/request-form-options";

export const metadata: Metadata = {
  title: "أنشئ طلبك | مطلوب",
  description: "انشر ما تحتاجه وخلي الموردين يوصلولك بعروضهم.",
};

export default async function CreateRequestPage({
  searchParams,
}: {
  searchParams: Promise<{ text?: string; category?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/create-request");
  }

  const options = await getRequestFormOptions();
  const { text, category } = await searchParams;

  // Hand-off from the homepage hero search bar (see
  // public/marketing/homepage-scripts.js goToCreateRequest()): it
  // passes the buyer's typed text and chosen category label as query
  // params instead of "searching" — prefill the form with them so
  // that trip isn't lost.
  const matchedCategory = category
    ? options.categories.find((c) => c.name === category)
    : undefined;

  return (
    <main dir="rtl" className="min-h-screen bg-surface-muted px-4 py-10 sm:py-16">
      <div className="mx-auto mb-8 max-w-2xl text-center">
        <h1 className="font-display text-2xl font-extrabold text-navy-950 sm:text-3xl">
          بدل ما تدور... اطلبها
        </h1>
        <p className="mt-2 text-sm text-text-500">
          اكتب تفاصيل ما تحتاجه، وخلي الموردين المناسبين يوصلولك بعروضهم.
        </p>
      </div>
      <RequestForm
        mode="create"
        options={options}
        initialValues={{
          title: text ?? "",
          categoryId: matchedCategory?.id ?? "",
        }}
      />
    </main>
  );
}

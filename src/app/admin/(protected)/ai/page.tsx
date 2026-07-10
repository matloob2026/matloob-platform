"use client";

import { Sparkles, MessageSquareText, Target, BarChart3, Bell } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Toggle } from "@/components/ui/Field";

const AI_MODULES = [
  {
    icon: MessageSquareText,
    title: "مساعد كتابة الطلبات (AI Request Assistant)",
    description:
      "يساعد المشتري على تحويل حاجته الغامضة إلى طلب واضح ومحدد بصياغة أفضل للعنوان والوصف.",
  },
  {
    icon: Target,
    title: "التصنيف التلقائي (Automatic Category Detection)",
    description: "يقترح التصنيف المناسب تلقائياً بناءً على نص الطلب الحر عند عدم اختيار المستخدم له.",
  },
  {
    icon: Sparkles,
    title: "المطابقة الذكية (Smart Matching)",
    description: "يرشّح ويُشعر الموردين الأنسب لكل طلب جديد بناءً على سجل عروضهم وتخصصهم.",
  },
  {
    icon: Bell,
    title: "الإشعارات الذكية (AI Notifications)",
    description: "يحدد اللحظات التي يكون فيها اقتراح ذكي مفيداً فعلاً للمستخدم قبل إرساله.",
  },
];

export default function AdminAiPage() {
  return (
    <div>
      <PageHeader
        title="الذكاء الاصطناعي"
        description="وحدات مستقبلية — لم يتم تفعيل أي منها بعد. الذكاء الاصطناعي هنا استشاري دائماً، ولا يتخذ أي قرار نيابة عن المستخدم."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {AI_MODULES.map((mod) => {
          const Icon = mod.icon;
          return (
            <Card key={mod.title} className="group transition-all duration-300 hover:-translate-y-0.5 hover:shadow-card-lg">
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-teal-100 text-teal-700 transition-transform duration-300 group-hover:scale-105">
                  <Icon className="h-5 w-5" />
                </div>
                <Badge tone="neutral">قريباً</Badge>
              </div>
              <h3 className="mt-4 font-display text-lg font-bold text-navy-950">{mod.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-text-500">{mod.description}</p>
              <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                <span className="text-xs text-text-400">مفتاح التفعيل (Feature Flag)</span>
                <Toggle checked={false} onChange={() => {}} />
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="mt-4">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-5 w-5 text-teal-600" />
          <h3 className="font-display text-lg font-bold text-navy-950">تحليلات الذكاء الاصطناعي</h3>
        </div>
        <p className="mt-2 text-sm text-text-500">
          بعد التفعيل، ستظهر هنا مؤشرات حول عدد الاقتراحات المقدَّمة ونسبة قبول المستخدمين لها —
          وهو ما يحدد فعلياً ما إذا كانت كل وحدة تستحق التوسّع فيها.
        </p>
      </Card>
    </div>
  );
}

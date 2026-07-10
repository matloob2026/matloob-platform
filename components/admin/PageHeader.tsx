import { Breadcrumbs } from "./Breadcrumbs";

export function PageHeader({
  title,
  description,
  breadcrumbCurrent,
  actions,
}: {
  title: string;
  description?: string;
  breadcrumbCurrent?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      <Breadcrumbs current={breadcrumbCurrent ?? title} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-extrabold text-navy-950 sm:text-2xl">
            {title}
          </h1>
          {description && <p className="mt-1 text-sm text-text-500">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

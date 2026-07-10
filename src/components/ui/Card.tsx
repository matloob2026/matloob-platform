import clsx from "clsx";

export function Card({
  children,
  className,
  padded = true,
}: {
  children: React.ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <div
      className={clsx(
        "rounded-card border border-border bg-white shadow-card",
        padded && "p-5 sm:p-6",
        className
      )}
    >
      {children}
    </div>
  );
}

import clsx from "clsx";

/** Notifications UX pass: spreads any remaining native `div` props
 * (`onClick`, `role`, `tabIndex`, `onKeyDown`, `aria-*`, ...) onto the
 * root element — purely additive, every existing call site that only
 * passes `children`/`className`/`padded` is completely unaffected.
 * Needed so a Card can become a clickable/keyboard-operable row (e.g.
 * NotificationRow) without duplicating its styles in a plain div. */
export function Card({
  children,
  className,
  padded = true,
  ...rest
}: {
  children: React.ReactNode;
  className?: string;
  padded?: boolean;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx(
        "rounded-card border border-border bg-white shadow-card",
        padded && "p-5 sm:p-6",
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

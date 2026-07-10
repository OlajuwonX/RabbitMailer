"use client";

import { memo, type ReactNode } from "react";
import Link from "next/link";
import { LinearCard, LinearButton } from "@/components/ui/linear";
import { cn } from "@/lib/utils/cn";

interface EmptyStateAction {
  label: string;
  /** Server Action or client handler. Wrap in useCallback in the parent to avoid re-renders. */
  onClick?: () => void;
  /** Use instead of onClick for navigation — renders a Next.js Link. */
  href?: string;
}

interface EmptyStateProps {
  /** Lucide icon node or any SVG element. Displayed inside the gradient icon box. */
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: EmptyStateAction;
  className?: string;
}

export const EmptyState = memo(function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <LinearCard
      padding="lg"
      className={cn(
        "flex flex-col items-center text-center py-12 gap-4",
        className,
      )}
    >
      {icon && (
        <div className="h-12 w-12 rounded-2xl bg-linear-to-br from-blue-600/20 to-violet-600/20 border border-violet-500/20 flex items-center justify-center text-violet-400">
          {icon}
        </div>
      )}

      <div className="space-y-1.5 max-w-xs">
        <p className="text-sm font-semibold text-slate-200">{title}</p>
        {description && (
          <p className="text-xs text-slate-500">{description}</p>
        )}
      </div>

      {action &&
        (action.href ? (
          <Link href={action.href}>
            <LinearButton variant="secondary" size="sm">
              {action.label}
            </LinearButton>
          </Link>
        ) : (
          <LinearButton variant="secondary" size="sm" onClick={action.onClick}>
            {action.label}
          </LinearButton>
        ))}
    </LinearCard>
  );
});

"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface PageLayoutProps {
  children?: ReactNode;
  title?: string | ReactNode;
  description?: string | ReactNode;
  icon?: ReactNode;
  primaryActions?: ReactNode;
  secondaryActions?: ReactNode;
  className?: string;
  size?: "default" | "full" | "large" | "small";
  isCompact?: boolean;
}

const PageLayout = ({
  children,
  title,
  description,
  icon,
  primaryActions,
  secondaryActions,
  className,
  size = "default",
  isCompact = false,
}: PageLayoutProps) => {
  const containerPadding = {
    default: "px-6",
    full: isCompact ? "px-6" : "px-10",
    large: "px-8",
    small: "px-4",
  };

  const headerPadding = {
    default: isCompact ? "pt-4 pb-6" : "pt-12 pb-8",
    full: isCompact ? "pt-4 pb-4" : "pt-6 pb-8",
    large: isCompact ? "pt-6 pb-8" : "pt-16 pb-10",
    small: isCompact ? "pt-3 pb-4" : "pt-8 pb-6",
  };

  const hasHeader = title || description || primaryActions || secondaryActions;

  return (
    <div
      className={cn(
        "flex h-full min-h-full w-full flex-col items-stretch",
        className
      )}
    >
      {hasHeader && (
        <div
          className={cn(
            "border-b bg-background",
            containerPadding[size],
            headerPadding[size]
          )}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-1">
              {icon && (
                <div className="mb-2 flex items-center gap-2 text-muted-foreground">
                  {icon}
                </div>
              )}
              {title && (
                <h1 className="text-2xl font-semibold tracking-tight">
                  {title}
                </h1>
              )}
              {description && (
                <p className="text-sm text-muted-foreground">{description}</p>
              )}
            </div>
            {(primaryActions || secondaryActions) && (
              <div className="flex items-center gap-2">
                {secondaryActions && (
                  <div className="flex items-center gap-2">
                    {secondaryActions}
                  </div>
                )}
                {primaryActions && (
                  <div className="flex items-center gap-2">
                    {primaryActions}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      <div
        className={cn(
          "flex-1 overflow-auto",
          containerPadding[size],
          hasHeader ? (isCompact ? "pt-4" : "pt-6") : headerPadding[size]
        )}
      >
        {children}
      </div>
    </div>
  );
};

export default PageLayout;

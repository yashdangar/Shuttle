"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { X, Truck, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { adminNavigation } from "@/config/navigation";
import React, { memo } from "react";

export const AdminSidebar = memo(function AdminSidebar({
  collapsed = false,
  isMobile = false,
  onClose,
}: {
  collapsed?: boolean;
  isMobile?: boolean;
  onClose?: () => void;
}) {
  const pathname = usePathname();

  return (
    <div
      className={cn(
        "h-full flex flex-col overflow-hidden",
        // Subtle gradient backdrop (remove heavy backdrop blur for faster paint)
        "bg-gradient-to-b from-white/80 to-slate-50/60 supports-[backdrop-filter]:bg-white/70 border-r border-slate-200/60",
        collapsed ? "w-16" : "w-64",
        isMobile && "shadow-xl"
      )}
    >
      <div
        className={cn(
          "relative flex items-center border-b border-slate-200/60",
          collapsed ? "justify-center px-6 py-5" : "px-6 py-5 gap-2.5"
        )}
      >
        <div className="h-8 w-8 shrink-0 rounded-lg bg-blue-600 text-white flex items-center justify-center">
          <Truck className="h-4 w-4" />
        </div>
        <div className={cn("min-w-0 overflow-hidden", collapsed && "opacity-0 w-0")} aria-hidden={collapsed}>
          <h1 className="text-sm font-semibold text-slate-800 tracking-tight whitespace-nowrap">Shuttle Admin</h1>
        </div>
        {isMobile && onClose && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2"
            onClick={onClose}
          >
            <X className="w-5 h-5" />
          </Button>
        )}
      </div>

      <TooltipProvider delayDuration={200}>
        <nav className="flex-1 p-2 space-y-1">
          {adminNavigation
            .filter((item) => !item.disabled)
            .map((item) => {
              const isActive = pathname === item.href;

              const link = (
                <Link
                  key={item.name}
                  href={item.href}
                  prefetch={false}
                  className={cn(
                    "relative group flex items-center rounded-lg text-[13px] font-medium",
                    "px-2.5 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30",
                    "transform-gpu translate-x-0 transition-[transform,background-color,color,opacity] duration-200 ease-out hover:translate-x-[2px]",
                    isActive
                      ? "text-slate-900 bg-blue-50/60 ring-1 ring-blue-200/60"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50",
                    collapsed && "justify-center px-0"
                  )}
                >
                  {/* Accent bar */}
                  <span
                    className={cn(
                      "pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-full bg-gradient-to-b from-blue-600 to-indigo-600 transition-opacity",
                      isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100",
                      collapsed && "hidden"
                    )}
                  />
                  {/* Icon container */}
                  <span
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-md transition-[background-color,color,transform] duration-200 shrink-0 ring-1 ring-inset ring-slate-200 group-hover:scale-[1.04]",
                      isActive
                        ? "bg-gradient-to-br from-blue-600 to-indigo-600 text-white ring-0 shadow-sm"
                        : "text-slate-600 group-hover:bg-slate-100"
                    )}
                  >
                    <item.icon className={cn("h-4 w-4")} />
                  </span>
                  {!collapsed && (
                    <div className="ml-2.5 min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate leading-5">{item.name}</span>
                        {item.badge && (
                          <span className="inline-flex items-center rounded px-1.5 py-0 text-[10px] font-medium bg-gradient-to-b from-slate-100 to-white ring-1 ring-slate-200 text-slate-700">
                            {item.badge}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {!collapsed && (
                    <ChevronRight className="ml-2 h-3.5 w-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-all duration-200 group-hover:translate-x-0.5" />
                  )}
                </Link>
              );

              if (collapsed) {
                return (
                  <div key={item.name}>
                    <Tooltip>
                      <TooltipTrigger asChild>{link}</TooltipTrigger>
                      <TooltipContent side="right" align="center">
                        <div className="max-w-[200px]">
                          <p className="text-sm font-medium">{item.name}</p>
                          {item.description && (
                            <p className="mt-0.5 text-xs text-slate-500">{item.description}</p>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                );
              }

              return (
                <div>{link}</div>
              );
            })}
        </nav>
      </TooltipProvider>
    </div>
  );
});

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Truck } from "lucide-react";
import { adminNavigation, NavigationItem } from "@/config/navigation";

export function AdminSidebar({
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
        "h-full bg-white border-r border-slate-200 flex flex-col transition-all duration-200",
        collapsed ? "w-16" : "w-64",
        isMobile && "shadow-xl"
      )}
    >
      <div
        className={cn(
          "p-6 border-b border-slate-200 flex items-center relative",
          collapsed ? "justify-center" : "space-x-3"
        )}
      >
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
          <Truck className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div>
            <h1 className="text-lg font-semibold text-slate-900">
              Shuttle Admin
            </h1>
            <p className="text-sm text-slate-500">Management Portal</p>
          </div>
        )}
        {isMobile && onClose && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2"
            onClick={onClose}
          >
            <X className="w-6 h-6" />
          </Button>
        )}
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {adminNavigation
          .filter((item) => !item.disabled)
          .map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-blue-50 text-blue-700 border border-blue-200"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                  collapsed && "justify-center"
                )}
                title={collapsed ? item.name : undefined}
              >
                <item.icon
                  className={cn(
                    "text-blue-600",
                    collapsed ? "w-6 h-6" : "w-5 h-5",
                    "shrink-0"
                  )}
                />
                {!collapsed && (
                  <div className="ml-3 flex-1">
                    <span>{item.name}</span>
                    {item.badge && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        {item.badge}
                      </span>
                    )}
                  </div>
                )}
              </Link>
            );
          })}
      </nav>
    </div>
  );
}

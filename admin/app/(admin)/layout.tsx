"use client";
import type React from "react";
import { useState, useEffect } from "react";
import { AdminSidebar } from "@/components/admin-sidebar";
import { AdminTopbar } from "@/components/admin-topbar";
import { Toaster } from "sonner";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) {
        setCollapsed(true);
      } else {
        setCollapsed(false);
        setMobileSidebarOpen(false);
      }
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleSidebarToggle = () => {
    if (isMobile) {
      setMobileSidebarOpen((open) => !open);
    } else {
      setCollapsed((c) => !c);
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 relative">
      {/* Mobile sidebar overlay */}
      {isMobile && mobileSidebarOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 w-64">
            <AdminSidebar
              collapsed={false}
              isMobile={true}
              onClose={() => setMobileSidebarOpen(false)}
            />
          </div>
        </>
      )}
      {/* Desktop sidebar */}
      {!isMobile && (
        <div
          className={
            collapsed
              ? "w-16 transition-all duration-200"
              : "w-64 transition-all duration-200"
          }
        >
          <AdminSidebar collapsed={collapsed} isMobile={false} />
        </div>
      )}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="sticky top-0 z-40">
          <AdminTopbar onToggleSidebar={handleSidebarToggle} />
        </div>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
      <Toaster />
    </div>
  );
}

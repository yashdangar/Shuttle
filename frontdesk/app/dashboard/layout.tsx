"use client";
import type React from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { ChatProvider } from "@/context/ChatContext";
import { useHotelId } from "@/hooks/use-hotel-id";

export default function Layout({ children }: { children: React.ReactNode }) {
  const { hotelId, loading } = useHotelId();
  const frontdeskId = 1; // TODO: Replace with real frontdeskId from profile/auth

  if (loading || !hotelId) return null;

  return (
    <ChatProvider hotelId={hotelId}>
      <DashboardLayout>{children}</DashboardLayout>
    </ChatProvider>
  );
}

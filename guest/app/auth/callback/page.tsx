"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function AuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get("token");
    const hotelId = searchParams.get("hotelId");
    if (!token) {
      router.push("/login");
    } else {
      document.cookie = `guestToken=${token}; path=/; max-age=86400; secure; samesite=strict`;
      
      if (hotelId) {
        router.push(`/hotel/${hotelId}`);
      } else {
        router.push("/select-hotel");
      }
    }
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600">Completing sign in...</p>
      </div>
    </div>
  );
}

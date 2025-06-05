"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LogoutPage() {
  const router = useRouter();
  useEffect(() => {
    window.localStorage.removeItem("frontdesk_logged_in");
    setTimeout(() => router.push("/login"), 1000);
  }, [router]);
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-lg text-gray-700">Logging out...</div>
    </div>
  );
}

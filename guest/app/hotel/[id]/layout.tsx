"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

function isTokenExpired(token: string | null): boolean {
  if (!token) return true;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (!payload.exp) return true;
    const now = Math.floor(Date.now() / 1000);
    return payload.exp < now;
  } catch {
    return true;
  }
}

export default function HotelProtectedLayout({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("guestToken");
    if (!token || isTokenExpired(token)) {
      localStorage.removeItem("guestToken");
      router.push("/login");
      setLoading(false);
      return;
    }
    // Validate token with backend
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/guest/profile`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })
      .then(res => {
        if (!res.ok) throw new Error("Invalid token");
        setIsAuthenticated(true);
      })
      .catch(() => {
        localStorage.removeItem("guestToken");
        router.push("/login");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [router]);

  if (loading) return null;
  if (!isAuthenticated) return null;
  return <>{children}</>;
} 
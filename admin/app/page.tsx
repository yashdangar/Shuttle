"use client";
import { useEffect } from "react";
import { redirect } from "next/navigation";

export default function HomePage() {
  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    if (token) {
      redirect("/dashboard");
    } else {
      redirect("/login");
    }
  }, []);

  // Show loading state while checking authentication
  return <div>Loading...</div>;
}

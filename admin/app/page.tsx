"use client";
import { redirect } from "next/navigation";

export default function HomePage() {
  const token = localStorage.getItem("token");
  if (token) {
    redirect("/dashboard");
  } else {
    redirect("/login");
  }
}

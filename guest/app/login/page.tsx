"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MapPin, Loader2 } from "lucide-react";

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // Check for existing token on component mount
  useEffect(() => {
    const token = localStorage.getItem("guestToken");
    if (token) {
      try {
        // Decode JWT token to check for hotelId
        const payload = JSON.parse(atob(token.split(".")[1]));
        console.log("Decoded token payload:", payload);

        if (payload.hotelId) {
          // If hotelId exists, redirect to hotel page
          router.push(`/hotel/${payload.hotelId}`);
        } else {
          // If no hotelId, redirect to select hotel page
          router.push("/select-hotel");
        }
      } catch (error) {
        console.error("Error decoding token:", error);
        // If token is invalid, remove it and stay on login page
        localStorage.removeItem("guestToken");
      }
    }
  }, [router]);

  const handleGoogleLogin = async () => {
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/auth/google`;
  };

  return (
    <div className="min-h-screen grid place-items-center bg-slate-50 dark:bg-slate-950 p-6">
      <div className="w-full max-w-md">
        <Card className="rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl bg-white dark:bg-slate-900">
          <CardHeader className="space-y-5">
            <div className="flex items-center justify-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center shadow-md">
                <MapPin className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-semibold text-gray-900 dark:text-white">ShuttleEase</span>
            </div>
            <div className="text-center space-y-1">
              <CardTitle className="text-3xl font-bold tracking-tight">Welcome Back</CardTitle>
              <CardDescription>Sign in with your Google account</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <Button
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full h-12 bg-white text-slate-900 hover:bg-slate-50 border border-slate-300 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700 dark:border-slate-700 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900 transition disabled:opacity-70"
              size="lg"
              variant="default"
              aria-busy={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Signing in...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span>Continue with Google</span>
                </div>
              )}
            </Button>

            <p className="text-center text-sm text-slate-500 dark:text-slate-400">
              You will be redirected to Google to sign in
            </p>
            <p className="text-center text-xs text-gray-600 dark:text-gray-300">
              By continuing, you agree to our Terms of Service and Privacy Policy
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

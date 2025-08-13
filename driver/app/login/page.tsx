"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ShuffleIcon as Shuttle,
  Eye,
  EyeOff,
  Loader2,
  Mail,
  Lock,
} from "lucide-react";
import { api } from "@/lib/api";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("driverToken");
    if (token) {
      router.push("/dashboard");
    }
  }, [router]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const data = await api.post("/driver/login", {
        email: formData.email,
        password: formData.password,
      });
      localStorage.setItem("driverToken", data.token);
      localStorage.setItem("driverLoggedIn", "true");
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 transition-colors">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="blob absolute -top-28 -left-24 h-72 w-72 rounded-full bg-blue-400/30 blur-3xl" />
        <div className="blob delay-1 absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-indigo-400/30 blur-3xl" />
        <div className="blob delay-2 absolute top-1/3 left-1/2 -translate-x-1/2 h-64 w-64 rounded-full bg-cyan-400/20 blur-3xl" />
      </div>

      <Card className={`relative w-full max-w-md border border-white/30 bg-white/60 backdrop-blur-xl shadow-xl shadow-blue-500/10 transition-all duration-500 ease-out ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}>
        <CardHeader className="text-center pb-8">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/20">
            <Shuttle className="h-8 w-8" />
          </div>
          <CardTitle className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900">
            Driver Login
          </CardTitle>
          <CardDescription className="text-base text-slate-600">
            Sign in to access your shuttle dashboard
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-slate-700">
                Email
              </Label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Mail className="h-4 w-4" />
                </span>
                <Input
                  id="email"
                  type="email"
                  placeholder="driver@airport.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="h-12 w-full pl-10 text-base bg-white/70 text-slate-900 placeholder:text-slate-400 border border-white/40 rounded-md transition-all duration-300 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 hover:border-blue-400/60"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-slate-700">
                Password
              </Label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Lock className="h-4 w-4" />
                </span>
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="h-12 w-full pl-10 pr-12 text-base bg-white/70 text-slate-900 placeholder:text-slate-400 border border-white/40 rounded-md transition-all duration-300 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 hover:border-blue-400/60"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-12 px-3 text-blue-600 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
               >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-base font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-[.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 disabled:opacity-60 disabled:cursor-not-allowed rounded-md shadow-md shadow-blue-600/20 transition-[transform,box-shadow] duration-200 hover:translate-y-[1px] hover:shadow-lg"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          <div className="text-center space-y-2">
            <p className="text-sm text-slate-600">
              Don't have an account?{" "}
              <Link href="/signup" className="font-medium text-blue-600 hover:underline">
                Sign up here
              </Link>
            </p>
            <p className="text-sm text-slate-600">
              <Link href="/forgot-password" className="font-medium text-blue-600 hover:underline">
                Forgot your password?
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
      <style jsx>{`
        @keyframes floatSlow {
          0% { transform: translate3d(0, 0, 0) scale(1) rotate(0deg); }
          50% { transform: translate3d(14px, -12px, 0) scale(1.05) rotate(10deg); }
          100% { transform: translate3d(0, 0, 0) scale(1) rotate(0deg); }
        }
        .blob { animation: floatSlow 16s ease-in-out infinite; }
        .delay-1 { animation-delay: 2s; }
        .delay-2 { animation-delay: 4s; }
      `}</style>
    </div>
  );
}

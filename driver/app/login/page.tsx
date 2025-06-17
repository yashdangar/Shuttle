"use client";

import type React from "react";

import { useState } from "react";
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
import { ShuffleIcon as Shuttle, Eye, EyeOff, Loader2 } from "lucide-react";
import { api } from "@/lib/api";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const data = await api.post("/driver/login", {
        email: formData.email,
        password: formData.password,
      });
      localStorage.setItem("token", data.token);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-blue-50 dark:bg-blue-950 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-blue-200 dark:border-blue-800">
        <CardHeader className="text-center pb-8">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-blue-600 dark:bg-blue-500">
            <Shuttle className="h-10 w-10 text-white" />
          </div>
          <CardTitle className="text-3xl font-bold text-black dark:text-white">
            Driver Login
          </CardTitle>
          <CardDescription className="text-base text-gray-600 dark:text-gray-300">
            Sign in to access your shuttle dashboard
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label
                htmlFor="email"
                className="text-sm font-medium text-black dark:text-white"
              >
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="driver@airport.com"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className="h-12 text-base bg-white dark:bg-blue-900 text-black dark:text-white border-blue-200 dark:border-blue-700"
                required
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="password"
                className="text-sm font-medium text-black dark:text-white"
              >
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  className="h-12 text-base pr-12 bg-white dark:bg-blue-900 text-black dark:text-white border-blue-200 dark:border-blue-700"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-12 px-3 hover:bg-transparent text-blue-600 dark:text-blue-400"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <Button
              type="submit"
              className="w-full h-12 text-base bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600"
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
          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Don't have an account?{" "}
              <Link
                href="/signup"
                className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
              >
                Sign up here
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

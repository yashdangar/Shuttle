"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Eye, EyeOff, Loader2, ShuffleIcon as Shuttle, Mail, Lock } from "lucide-react";
import { api } from "@/lib/api";

const OTP_LENGTH = 6;

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(""));
  const [isLoading, setIsLoading] = useState(false);
  const [backendMsg, setBackendMsg] = useState("");
  const [backendError, setBackendError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle OTP input
  const handleOtpChange = (idx: number, value: string) => {
    if (!/^[0-9]?$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[idx] = value;
    setOtp(newOtp);
    if (value && idx < OTP_LENGTH - 1) {
      otpRefs.current[idx + 1]?.focus();
    }
  };

  // Handle OTP backspace
  const handleOtpKeyDown = (
    idx: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Backspace" && !otp[idx] && idx > 0) {
      // If current field is empty and backspace is pressed, go to previous field
      otpRefs.current[idx - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const paste = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, OTP_LENGTH);
    if (paste.length === OTP_LENGTH) {
      setOtp(paste.split(""));
      otpRefs.current[OTP_LENGTH - 1]?.focus();
    }
  };

  // Step 1: Send OTP
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setBackendMsg("");
    setBackendError("");
    setIsLoading(true);
    try {
      const data = await api.post("/driver/forgot-password", { email });
      setBackendMsg(data.message);
      setStep(2);
    } catch (err: any) {
      setBackendError(err.message || "Failed to send OTP");
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setBackendMsg("");
    setBackendError("");
    setIsLoading(true);
    try {
      const otpValue = otp.join("");
      if (otpValue.length !== OTP_LENGTH) {
        setBackendError("Please enter the 6-digit OTP");
        setIsLoading(false);
        return;
      }
      const data = await api.post("/driver/verify-otp", {
        email,
        otp: otpValue,
      });
      setBackendMsg(data.message);
      setStep(3);
    } catch (err: any) {
      setBackendError(err.message || "OTP verification failed");
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3: Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setBackendMsg("");
    setBackendError("");
    if (newPassword.length < 6) {
      setBackendError("Password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setBackendError("Passwords do not match");
      return;
    }
    setIsLoading(true);
    try {
      const data = await api.post("/driver/reset-password", {
        email,
        newPassword,
      });
      setBackendMsg(data.message);
      setTimeout(() => router.push("/login"), 2000);
    } catch (err: any) {
      setBackendError(err.message || "Password reset failed");
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
            Forgot Password
          </CardTitle>
          <CardDescription className="text-base text-slate-600">
            {step === 1 && "Enter your email to receive an OTP."}
            {step === 2 && "Enter the 6-digit OTP sent to your email."}
            {step === 3 && "Set your new password."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {backendMsg && (
            <div className="p-3 rounded-lg bg-green-50 text-green-700 text-sm border border-green-100">
              {backendMsg}
            </div>
          )}
          {backendError && (
            <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-100">
              {backendError}
            </div>
          )}
          {step === 1 && (
            <form onSubmit={handleSendOtp} className="space-y-5">
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
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 w-full pl-10 text-base bg-white/70 text-slate-900 placeholder:text-slate-400 border border-white/40 rounded-md transition-all duration-300 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 hover:border-blue-400/60"
                    required
                  />
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
                    Sending...
                  </>
                ) : (
                  "Send OTP"
                )}
              </Button>
            </form>
          )}
          {step === 2 && (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">OTP</Label>
                <div className="flex gap-2 justify-center">
                  {otp.map((digit, idx) => (
                    <Input
                      key={idx}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      onPaste={idx === 0 ? handleOtpPaste : undefined}
                      ref={(el) => {
                        if (el) otpRefs.current[idx] = el;
                      }}
                      className="w-12 h-12 text-center text-lg bg-white/70 text-slate-900 border border-white/40 rounded-md transition-all duration-300 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
                    />
                  ))}
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
                    Verifying...
                  </>
                ) : (
                  "Verify OTP"
                )}
              </Button>
            </form>
          )}
          {step === 3 && (
            <form onSubmit={handleResetPassword} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-slate-700">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  disabled
                  className="h-12 text-base bg-gray-100 text-gray-600 border border-white/40 rounded-md"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword" className="text-sm font-medium text-slate-700">
                  New Password
                </Label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <Lock className="h-4 w-4" />
                  </span>
                  <Input
                    id="newPassword"
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
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
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium text-slate-700">
                  Confirm Password
                </Label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <Lock className="h-4 w-4" />
                  </span>
                  <Input
                    id="confirmPassword"
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="h-12 w-full pl-10 pr-12 text-base bg-white/70 text-slate-900 placeholder:text-slate-400 border border-white/40 rounded-md transition-all duration-300 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 hover:border-blue-400/60"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-12 px-3 text-blue-600 hover:bg-transparent"
                    onClick={() => setShowConfirm(!showConfirm)}
                  >
                    {showConfirm ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
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
                    Updating...
                  </>
                ) : (
                  "Update Password"
                )}
              </Button>
            </form>
          )}
          <div className="text-center">
            <p className="text-sm text-slate-600">
              Remember your password?{" "}
              <Link href="/login" className="font-medium text-blue-600 hover:underline">
                Sign in here
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

"use client";

import React, { useState, useRef } from "react";
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
import { Eye, EyeOff, Loader2, ShuffleIcon as Shuttle } from "lucide-react";
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
    <div className="min-h-screen bg-blue-50 dark:bg-blue-950 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-blue-200 dark:border-blue-800">
        <CardHeader className="text-center pb-8">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-blue-600 dark:bg-blue-500">
            <Shuttle className="h-10 w-10 text-white" />
          </div>
          <CardTitle className="text-3xl font-bold text-black dark:text-white">
            Forgot Password
          </CardTitle>
          <CardDescription className="text-base text-gray-600 dark:text-gray-300">
            {step === 1 && "Enter your email to receive an OTP."}
            {step === 2 && "Enter the 6-digit OTP sent to your email."}
            {step === 3 && "Set your new password."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {backendMsg && (
            <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-sm">
              {backendMsg}
            </div>
          )}
          {backendError && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm">
              {backendError}
            </div>
          )}
          {step === 1 && (
            <form onSubmit={handleSendOtp} className="space-y-5">
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
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 text-base bg-white dark:bg-blue-900 text-black dark:text-white border-blue-200 dark:border-blue-700"
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full h-12 text-base bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600"
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
                <Label className="text-sm font-medium text-black dark:text-white">
                  OTP
                </Label>
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
                      className="w-12 h-12 text-center text-lg bg-white dark:bg-blue-900 text-black dark:text-white border-blue-200 dark:border-blue-700"
                    />
                  ))}
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
                <Label
                  htmlFor="email"
                  className="text-sm font-medium text-black dark:text-white"
                >
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  disabled
                  className="h-12 text-base bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-blue-200 dark:border-blue-700"
                />
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="newPassword"
                  className="text-sm font-medium text-black dark:text-white"
                >
                  New Password
                </Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
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
              <div className="space-y-2">
                <Label
                  htmlFor="confirmPassword"
                  className="text-sm font-medium text-black dark:text-white"
                >
                  Confirm Password
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="h-12 text-base pr-12 bg-white dark:bg-blue-900 text-black dark:text-white border-blue-200 dark:border-blue-700"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-12 px-3 hover:bg-transparent text-blue-600 dark:text-blue-400"
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
                className="w-full h-12 text-base bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600"
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
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Remember your password?{" "}
              <Link
                href="/login"
                className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
              >
                Sign in here
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

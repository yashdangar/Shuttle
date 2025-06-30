"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";

export default function DebugPage() {
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [loading, setLoading] = useState(false);

  const checkAuth = () => {
    const token = localStorage.getItem("guestToken");
    const info: any = {
      hasToken: !!token,
      tokenPreview: token ? token.substring(0, 50) + "..." : "No token",
    };

    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        info.tokenPayload = payload;
        info.tokenExpired = new Date(payload.exp * 1000) < new Date();
      } catch (e) {
        info.tokenDecodeError = e;
      }
    }

    setDebugInfo(info);
  };

  const testProfile = async () => {
    setLoading(true);
    try {
      const response = await api.get("/guest/profile");
      setDebugInfo(prev => ({ ...prev, profileResponse: response }));
    } catch (error) {
      setDebugInfo(prev => ({ ...prev, profileError: error }));
    } finally {
      setLoading(false);
    }
  };

  const testCurrentBooking = async () => {
    setLoading(true);
    try {
      const response = await api.get("/guest/current-booking");
      setDebugInfo(prev => ({ ...prev, currentBookingResponse: response }));
    } catch (error) {
      setDebugInfo(prev => ({ ...prev, currentBookingError: error }));
    } finally {
      setLoading(false);
    }
  };

  const testETA = async () => {
    setLoading(true);
    try {
      // Use a test booking ID
      const response = await api.get("/guest/booking/test-booking-id/eta");
      setDebugInfo(prev => ({ ...prev, etaResponse: response }));
    } catch (error) {
      setDebugInfo(prev => ({ ...prev, etaError: error }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <div className="container mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-bold">Guest Debug Page</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Authentication Status</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button onClick={checkAuth} disabled={loading}>
          Check Auth
        </Button>
        <Button onClick={testProfile} disabled={loading}>
          Test Profile
        </Button>
        <Button onClick={testCurrentBooking} disabled={loading}>
          Test Current Booking
        </Button>
        <Button onClick={testETA} disabled={loading}>
          Test ETA
        </Button>
      </div>

      {loading && (
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p>Loading...</p>
        </div>
      )}
    </div>
  );
} 
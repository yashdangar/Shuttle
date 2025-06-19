"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MapPin, Clock, Shield, Star } from "lucide-react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LandingPage() {
  const router = useRouter();
  useEffect(() => {
    const token = localStorage.getItem("guestToken")
    if (token) {
      try {
        // Decode JWT token to check for hotelId
        const payload = JSON.parse(atob(token.split(".")[1]))
        console.log("Decoded token payload:", payload)
        
        if (payload.hotelId) {
          // If hotelId exists, redirect to hotel page
          router.push(`/hotel/${payload.hotelId}`)
        } else {
          // If no hotelId, redirect to select hotel page
          router.push("/select-hotel")
        }
      } catch (error) {
        // If token is invalid, remove it and stay on login page
        localStorage.removeItem("guestToken")
      }
    }
  }, [router])
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">ShuttleEase</span>
          </div>
          <Link href="/login">
            <Button variant="outline">Sign In</Button>
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-12">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Your Hotel Shuttle,
            <span className="text-blue-600"> Simplified</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Book your hotel shuttle rides with ease. Real-time tracking, instant
            confirmations, and seamless travel experience.
          </p>
          <Link href="/login">
            <Button size="lg" className="text-lg px-8 py-3">
              Get Started
            </Button>
          </Link>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <Card className="text-center">
            <CardHeader>
              <Clock className="w-12 h-12 text-blue-600 mx-auto mb-4" />
              <CardTitle>Real-Time Tracking</CardTitle>
              <CardDescription>
                Track your shuttle in real-time with live ETA updates every
                minute
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Shield className="w-12 h-12 text-blue-600 mx-auto mb-4" />
              <CardTitle>Secure Booking</CardTitle>
              <CardDescription>
                Safe and secure booking process with QR code confirmation
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Star className="w-12 h-12 text-blue-600 mx-auto mb-4" />
              <CardTitle>Premium Service</CardTitle>
              <CardDescription>
                Professional drivers and comfortable shuttles for your
                convenience
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* How it Works */}
        <div className="bg-white rounded-2xl p-8 shadow-lg">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-600">1</span>
              </div>
              <h3 className="font-semibold mb-2">Sign In</h3>
              <p className="text-gray-600">Login with your Google account</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-600">2</span>
              </div>
              <h3 className="font-semibold mb-2">Select Hotel</h3>
              <p className="text-gray-600">Choose your hotel destination</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-600">3</span>
              </div>
              <h3 className="font-semibold mb-2">Book Ride</h3>
              <p className="text-gray-600">Select time and confirm booking</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-600">4</span>
              </div>
              <h3 className="font-semibold mb-2">Track & Ride</h3>
              <p className="text-gray-600">
                Track your shuttle and enjoy the ride
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 mt-16">
        <div className="text-center text-gray-600">
          <p>&copy; 2024 ShuttleEase. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

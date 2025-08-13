"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MapPin, Clock, Shield, Star, Quote } from "lucide-react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

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
  const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  const staggerParent = {
    hidden: {},
    visible: {
      transition: { staggerChildren: 0.1 }
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gray-50">

      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white/90 px-4 py-3 shadow-sm backdrop-blur-xl">
          <div className="flex items-center space-x-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md">
              <MapPin className="h-5 w-5" />
            </div>
            <span className="text-xl font-extrabold tracking-tight text-gray-900">ShuttleEase</span>
          </div>
          <Link href="/login">
            <Button variant="outline" className="border-indigo-200 bg-white/80 text-indigo-700 hover:bg-indigo-50">
              Sign In
            </Button>
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-12">
        <motion.section
          initial="hidden"
          animate="visible"
          variants={staggerParent}
          className="relative z-10 mb-16 text-center"
        >
          <motion.h1
            variants={fadeInUp}
            transition={{ duration: 0.6 }}
            className="mx-auto mb-6 max-w-4xl text-5xl font-extrabold tracking-tight text-gray-900 md:text-6xl"
          >
            Your Hotel Shuttle, <span className="whitespace-nowrap">Simplified</span>
          </motion.h1>
          <motion.p
            variants={fadeInUp}
            transition={{ delay: 0.05 }}
            className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-gray-600 md:text-xl"
          >
            Book rides in seconds, track in real-time, and breeze through your journey with elegant, secure confirmations.
          </motion.p>
          <motion.div variants={fadeInUp} className="flex items-center justify-center gap-4">
            <Link href="/login">
              <Button size="lg" className="relative rounded-xl bg-indigo-600 px-8 py-6 text-lg text-white shadow-lg transition-transform hover:-translate-y-0.5 hover:bg-indigo-700">
                Get Started
              </Button>
            </Link>
            <a href="#how-it-works">
              <Button size="lg" variant="outline" className="rounded-xl border-gray-200 bg-white px-8 py-6 text-lg text-gray-800 hover:bg-gray-50">
                Learn More
              </Button>
            </a>
          </motion.div>
        </motion.section>

        {/* Stats */}
        <motion.section
          variants={staggerParent}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          className="mb-16"
        >
          <motion.div
            variants={fadeInUp}
            className="grid gap-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:grid-cols-3"
          >
            {[{
              value: "120K+",
              label: "Bookings Completed"
            }, {
              value: "99.2%",
              label: "On-time Arrivals"
            }, {
              value: "200+",
              label: "Partner Hotels"
            }].map(({ value, label }, idx) => (
              <div key={idx} className="flex flex-col items-center justify-center py-4">
                <div className="text-3xl font-extrabold text-gray-900">{value}</div>
                <div className="mt-1 text-sm text-gray-500">{label}</div>
              </div>
            ))}
          </motion.div>
        </motion.section>

        {/* Feature Cards */}
        <motion.div
          variants={staggerParent}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          className="mb-20 grid gap-6 md:grid-cols-3"
        >
          <motion.div variants={fadeInUp} whileHover={{ y: -6 }} transition={{ type: "spring", stiffness: 260, damping: 18 }}>
            <Card className="group relative overflow-hidden border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">
                  <Clock className="h-8 w-8" />
                </div>
                <CardTitle>Real-Time Tracking</CardTitle>
                <CardDescription>Live ETAs and movement updates at a glance</CardDescription>
              </CardHeader>
            </Card>
          </motion.div>

          <motion.div variants={fadeInUp} whileHover={{ y: -6 }} transition={{ type: "spring", stiffness: 260, damping: 18 }}>
            <Card className="group relative overflow-hidden border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">
                  <Shield className="h-8 w-8" />
                </div>
                <CardTitle>Secure Booking</CardTitle>
                <CardDescription>Bank-grade security with QR confirmations</CardDescription>
              </CardHeader>
            </Card>
          </motion.div>

          <motion.div variants={fadeInUp} whileHover={{ y: -6 }} transition={{ type: "spring", stiffness: 260, damping: 18 }}>
            <Card className="group relative overflow-hidden border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">
                  <Star className="h-8 w-8" />
                </div>
                <CardTitle>Premium Service</CardTitle>
                <CardDescription>Professional drivers and comfortable rides</CardDescription>
              </CardHeader>
            </Card>
          </motion.div>
        </motion.div>

        {/* How it Works */}
        <section id="how-it-works" className="relative">
          <motion.div
            variants={staggerParent}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm"
          >
            <motion.h2 variants={fadeInUp} className="mb-10 text-center text-3xl font-bold tracking-tight text-gray-900">
              How It Works
            </motion.h2>
            <div className="grid gap-8 md:grid-cols-4">
              {[1, 2, 3, 4].map((step) => (
                <motion.div key={step} variants={fadeInUp} className="text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
                    <span className="text-2xl font-bold">{step}</span>
                  </div>
                  <h3 className="mb-2 font-semibold text-gray-900">
                    {step === 1 && "Sign In"}
                    {step === 2 && "Select Hotel"}
                    {step === 3 && "Book Ride"}
                    {step === 4 && "Track & Ride"}
                  </h3>
                  <p className="text-gray-600">
                    {step === 1 && "Login with your Google account"}
                    {step === 2 && "Choose your hotel destination"}
                    {step === 3 && "Select time and confirm booking"}
                    {step === 4 && "Track your shuttle and enjoy the ride"}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* Trusted By */}
        <motion.section
          variants={staggerParent}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          className="mt-16"
        >
          <motion.div variants={fadeInUp} className="text-center text-sm font-medium text-gray-500">
            Trusted by leading hotels
          </motion.div>
          <motion.div
            variants={fadeInUp}
            className="mt-4 grid items-center justify-items-center gap-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:grid-cols-5"
          >
            {["HORIZON", "CRESTWOOD", "BLUEBIRD", "ALPINA", "SEAVIEW"].map((brand) => (
              <div key={brand} className="w-full max-w-[160px] rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-center text-xs font-semibold tracking-wide text-gray-600">
                {brand}
              </div>
            ))}
          </motion.div>
        </motion.section>

        {/* Testimonials */}
        <motion.section
          variants={staggerParent}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          className="mt-16"
        >
          <motion.h3 variants={fadeInUp} className="mb-8 text-center text-2xl font-bold text-gray-900">
            Loved by Travelers
          </motion.h3>
          <div className="grid gap-6 md:grid-cols-3">
            {[{
              name: "Aarav P.",
              quote: "Seamless from booking to arrival. The live tracking is super reassuring.",
              role: "Frequent Flyer"
            }, {
              name: "Maya R.",
              quote: "Clean interface and quick confirmations. This made my trip stress-free.",
              role: "Business Traveler"
            }, {
              name: "Dev K.",
              quote: "Booked in under a minute and the shuttle was right on time.",
              role: "Vacationer"
            }].map(({ name, quote, role }, idx) => (
              <motion.div key={idx} variants={fadeInUp} className="h-full">
                <Card className="h-full border border-gray-200 bg-white shadow-sm">
                  <CardHeader>
                    <div className="mb-2 flex items-center gap-2 text-indigo-600">
                      <Quote className="h-5 w-5" />
                      <span className="text-sm font-semibold">Testimonial</span>
                    </div>
                    <CardDescription className="text-base text-gray-700">“{quote}”</CardDescription>
                    <div className="mt-4 text-sm text-gray-500">{name} · {role}</div>
                  </CardHeader>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Final CTA */}
        <motion.section
          variants={staggerParent}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          className="mt-16"
        >
          <motion.div variants={fadeInUp} className="items-center justify-between gap-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:flex">
            <div>
              <h4 className="text-xl font-bold text-gray-900">Ready to simplify your shuttle experience?</h4>
              <p className="mt-1 text-gray-600">Join thousands of travelers who ride with ease.</p>
            </div>
            <div className="mt-4 md:mt-0">
              <Link href="/login">
                <Button size="lg" className="rounded-xl bg-indigo-600 px-6 py-5 text-white hover:bg-indigo-700">Get Started</Button>
              </Link>
            </div>
          </motion.div>
        </motion.section>
      </main>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-10">
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center text-gray-500">
          <p>© 2024 ShuttleEase. All rights reserved.</p>
        </motion.div>
      </footer>
    </div>
  );
}

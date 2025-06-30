"use client";

import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, QrCode, History, Plus } from "lucide-react";
import CurrentBookings from "@/components/current-bookings";
import BookingHistory from "@/components/booking-history";
import NewBooking from "@/components/new-booking";
import { useRouter, useParams } from "next/navigation";
import { api } from "@/lib/api";
import { useWebSocket } from "@/context/WebSocketContext";

interface Hotel {
  id: number;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}

function HotelPageSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Skeleton */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Skeleton className="w-10 h-10 rounded-lg" />
              <div>
                <Skeleton className="h-6 w-48 mb-2" />
                <Skeleton className="h-4 w-64" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Skeleton */}
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex space-x-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="py-4 px-1">
                <div className="flex items-center space-x-2">
                  <Skeleton className="w-4 h-4" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content Skeleton */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid gap-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HotelPage() {
  const params = useParams();
  const router = useRouter();
  const { onBookingUpdate } = useWebSocket();
  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null);
  const [activeTab, setActiveTab] = useState("current");
  const [currentBookings, setCurrentBookings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch current bookings from API
  const fetchCurrentBookings = useCallback(async () => {
    try {
      const response = await api.get('/guest/current-booking');
      if (response.currentBookings && response.currentBookings.length > 0) {
        console.log("Found current bookings from API:", response.currentBookings);
        setCurrentBookings(response.currentBookings);
      } else {
        setCurrentBookings([]);
      }
    } catch (error) {
      console.error("Error fetching current bookings:", error);
      setCurrentBookings([]);
    }
  }, []);

  // Memoize the booking update handler to prevent infinite loops
  const handleBookingUpdate = useCallback((updatedBooking: any) => {
    console.log("Received booking update via WebSocket:", updatedBooking);
    
    // Update the current bookings with the new data
    setCurrentBookings(prev => 
      prev.map(booking => 
        booking.id === updatedBooking.id ? { ...booking, ...updatedBooking } : booking
      )
    );
    
    // If we're not on the current booking tab, switch to it
    if (activeTab !== "current") {
      setActiveTab("current");
    }
  }, [activeTab]);

  // Memoize the onBookingCreated callback to prevent unnecessary re-renders
  const handleBookingCreated = useCallback(async (booking: any) => {
    console.log("New booking created:", booking);
    // Refresh current bookings from API
    await fetchCurrentBookings();
    setActiveTab("current");
  }, [fetchCurrentBookings]);

  useEffect(() => {
    const hotelId = params.id as string;
    console.log(hotelId);
    if (hotelId) {
      const fetchHotel = async () => {
        try {
          setIsLoading(true);
          const response = await api.get(`/guest/get-hotel/${hotelId}`);
          console.log(response);
          setSelectedHotel(response.hotel.hotel)
        } catch (error) {
          console.error("Error fetching hotel:", error);
        } finally {
          setIsLoading(false);
        }
      };
      fetchHotel();
    } else {
      router.push("/select-hotel");
    }

    // Fetch current bookings from API
    fetchCurrentBookings();
  }, [params.id, router, fetchCurrentBookings]);

  // Listen for booking updates via WebSocket
  useEffect(() => {
    if (!onBookingUpdate) return;

    const cleanup = onBookingUpdate(handleBookingUpdate);
    return cleanup;
  }, [onBookingUpdate, handleBookingUpdate]);

  if (isLoading || !selectedHotel) {
    return <HotelPageSkeleton />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <MapPin className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{selectedHotel.name}</h1>
                <p className="text-sm text-gray-600">{selectedHotel.address}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab("current")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "current"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <div className="flex items-center space-x-2">
                <QrCode className="w-4 h-4" />
                <span>Current Bookings</span>
                {currentBookings.length > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {currentBookings.length}
                  </Badge>
                )}
              </div>
            </button>
            <button
              onClick={() => setActiveTab("new")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "new"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <div className="flex items-center space-x-2">
                <Plus className="w-4 h-4" />
                <span>New Booking</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "history"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <div className="flex items-center space-x-2">
                <History className="w-4 h-4" />
                <span>History</span>
              </div>
            </button>
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {activeTab === "current" && (
          <CurrentBookings
            bookings={currentBookings}
            onNewBooking={() => setActiveTab("new")}
          />
        )}
        {activeTab === "new" && (
          <NewBooking
            key={selectedHotel.id}
            hotel={selectedHotel}
            onBookingCreated={handleBookingCreated}
          />
        )}
        {activeTab === "history" && <BookingHistory />}
      </div>
    </div>
  );
}

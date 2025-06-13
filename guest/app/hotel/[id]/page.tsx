"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { MapPin, QrCode, History, Plus } from "lucide-react";
import CurrentBooking from "@/components/current-booking";
import BookingHistory from "@/components/booking-history";
import NewBooking from "@/components/new-booking";
import { useRouter, useParams } from "next/navigation";
import { api } from "@/lib/api";

interface Hotel {
  id: number;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}
export default function HotelPage() {
  const params = useParams();
  const router = useRouter();
  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null);
  const [activeTab, setActiveTab] = useState("current");
  const [currentBooking, setCurrentBooking] = useState<any>(null);

  useEffect(() => {
    const hotelId = params.id as string;
    console.log(hotelId);
    if (hotelId) {
      const fetchHotel = async () => {
        const response = await api.get(`/guest/get-hotel/${hotelId}`);
        console.log(response);
        setSelectedHotel(response.hotel.hotel)
      };
      fetchHotel();
    } else {
      router.push("/select-hotel");
    }

    // Check for current booking
    const booking = localStorage.getItem("currentBooking");
    if (booking) {
      setCurrentBooking(JSON.parse(booking));
    }
  }, []);

  if (!selectedHotel) {
    return <div>Loading...</div>;
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
            <Badge variant="secondary" className="text-sm">
              Connected
            </Badge>
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
                <span>Current Booking</span>
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
          <CurrentBooking
            booking={currentBooking}
            onNewBooking={() => setActiveTab("new")}
          />
        )}
        {activeTab === "new" && (
          <NewBooking
            hotel={selectedHotel}
            onBookingCreated={(booking) => {
              setCurrentBooking(booking);
              setActiveTab("current");
            }}
          />
        )}
        {activeTab === "history" && <BookingHistory />}
      </div>
    </div>
  );
}

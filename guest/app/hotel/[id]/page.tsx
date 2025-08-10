"use client";

import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MapPin, QrCode, History, Plus, User, ArrowLeft } from "lucide-react";
import CurrentBookings from "@/components/current-bookings";
import BookingHistory from "@/components/booking-history";
import NewBooking from "@/components/new-booking";
import { NotificationDrawer } from "@/components/notification-drawer";
import { ChatSheet } from "@/components/chat-sheet";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { useWebSocket } from "@/context/WebSocketContext";
import { ChatProvider } from "@/context/ChatContext";

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
        <div className="max-w-6xl mx-auto px-4">
          {/* Top Row Skeleton */}
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center space-x-3 min-w-0 flex-1">
              <Skeleton className="w-8 h-8 rounded" />
              <Skeleton className="w-8 h-8 rounded-lg" />
              <div className="min-w-0 flex-1">
                <Skeleton className="h-5 w-48 mb-1" />
                <Skeleton className="h-3 w-64" />
              </div>
            </div>
            <div className="flex items-center space-x-2 ml-3">
              <Skeleton className="w-9 h-9 rounded" />
              <Skeleton className="w-9 h-9 rounded" />
              <Skeleton className="w-20 h-9 rounded" />
            </div>
          </div>

          {/* Bottom Row Skeleton */}
          <div className="border-t border-gray-100">
            <div className="flex justify-center sm:justify-start py-3">
              <div className="flex space-x-6 sm:space-x-8">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center space-x-2">
                    <Skeleton className="w-4 h-4" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                ))}
              </div>
            </div>
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
  const searchParams = useSearchParams();
  const { onBookingUpdate } = useWebSocket();
  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null);
  const [activeTab, setActiveTab] = useState("current");
  const [currentBookings, setCurrentBookings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingBookings, setIsLoadingBookings] = useState(false);
  const [guestEmail, setGuestEmail] = useState("guest@example.com");
  const [guestName, setGuestName] = useState("Guest User");
  const [guestId, setGuestId] = useState<number | null>(null);

  // Function to create guest name from email
  const createGuestName = (email: string) => {
    if (!email || email === "guest@example.com") return "Guest User";

    // Extract the part before @ symbol
    const emailPart = email.split("@")[0];

    // Handle different email formats
    if (emailPart.includes(".")) {
      // Format: john.doe@example.com -> John Doe
      return emailPart
        .split(".")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
    } else if (emailPart.includes("_")) {
      // Format: john_doe@example.com -> John Doe
      return emailPart
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
    } else {
      // Format: johndoe@example.com -> Johndoe
      return emailPart.charAt(0).toUpperCase() + emailPart.slice(1);
    }
  };

  // Fetch guest profile data
  const fetchGuestData = useCallback(async () => {
    try {
      const profileResponse = await api.get("/guest/profile");
      if (profileResponse.guest) {
        setGuestId(profileResponse.guest.id);
        const email = profileResponse.guest.email || "guest@example.com";
        setGuestEmail(email);

        // Use actual firstName and lastName if available, otherwise fallback to email-based name
        if (profileResponse.guest.firstName && profileResponse.guest.lastName) {
          setGuestName(
            `${profileResponse.guest.firstName} ${profileResponse.guest.lastName}`
          );
        } else if (profileResponse.guest.firstName) {
          setGuestName(profileResponse.guest.firstName);
        } else if (profileResponse.guest.lastName) {
          setGuestName(profileResponse.guest.lastName);
        } else {
          setGuestName(createGuestName(email));
        }
      }
    } catch (error) {
      console.error("Error fetching guest data:", error);
      // Fallback to localStorage for guest info if API fails
      const token = localStorage.getItem("guestToken");
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split(".")[1]));
          const email = payload.email || "guest@example.com";
          setGuestEmail(email);
          setGuestName(createGuestName(email));
        } catch (error) {
          console.error("Error decoding token:", error);
        }
      }
    }
  }, []);

  // Fetch current bookings from API
  const fetchCurrentBookings = useCallback(async () => {
    try {
      setIsLoadingBookings(true);
      const hotelId = params.id as string;
      const response = await api.get(`/guest/current-booking/${hotelId}`);
      if (response.currentBookings && response.currentBookings.length > 0) {
        console.log(
          "Found current bookings from API:",
          response.currentBookings
        );
        setCurrentBookings(response.currentBookings);
      } else {
        setCurrentBookings([]);
      }
    } catch (error) {
      console.error("Error fetching current bookings:", error);
      setCurrentBookings([]);
    } finally {
      setIsLoadingBookings(false);
    }
  }, [params.id]);

  // Memoize the booking update handler to prevent infinite loops
  const handleBookingUpdate = useCallback(
    (updatedBooking: any) => {
      console.log("Received booking update via WebSocket:", updatedBooking);

      // Update the current bookings with the new data
      setCurrentBookings((prev) =>
        prev.map((booking) =>
          booking.id === updatedBooking.id
            ? { ...booking, ...updatedBooking }
            : booking
        )
      );

      // If we're not on the current booking tab, switch to it
      if (activeTab !== "current") {
        setActiveTab("current");
      }
    },
    [activeTab]
  );

  // Memoize the onBookingCreated callback to prevent unnecessary re-renders
  const handleBookingCreated = useCallback(
    async (booking: any) => {
      console.log("New booking created:", booking);
      // Refresh current bookings from API
      await fetchCurrentBookings();
      setActiveTab("current");
    },
    [fetchCurrentBookings]
  );

  const handleSignOut = () => {
    localStorage.removeItem("guestToken");
    router.push("/login");
  };

  const handleGoBack = () => {
    router.push("/select-hotel");
  };

  useEffect(() => {
    const hotelId = params.id as string;
    console.log(hotelId);
    if (hotelId) {
      const fetchHotel = async () => {
        try {
          setIsLoading(true);
          const response = await api.get(`/guest/get-hotel/${hotelId}`);
          console.log(response);
          setSelectedHotel(response.hotel.hotel);
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

    // Fetch current bookings and guest data
    fetchCurrentBookings();
    fetchGuestData();
  }, [params.id, router, fetchCurrentBookings, fetchGuestData]);

  // Sync tab from query param (?tab=current|new|history)
  useEffect(() => {
    const tab = (searchParams?.get("tab") || "").toLowerCase();
    if (tab === "current" || tab === "new" || tab === "history") {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // Listen for booking updates via WebSocket
  useEffect(() => {
    if (!onBookingUpdate) return;

    const cleanup = onBookingUpdate(handleBookingUpdate);
    return cleanup;
  }, [onBookingUpdate, handleBookingUpdate]);

  if (isLoading || !selectedHotel || !guestId) {
    return <HotelPageSkeleton />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Responsive Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4">
          {/* Top Row: Hotel Info and Actions */}
          <div className="flex items-center justify-between py-3">
            {/* Left: Hotel Info with Go Back Button */}
            <div className="flex items-center space-x-3 min-w-0 flex-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleGoBack}
                className="hover:bg-gray-100 flex-shrink-0"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <MapPin className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-base sm:text-lg font-bold text-gray-900 truncate">
                  {selectedHotel.name}
                </h1>
                <p className="text-xs text-gray-600 truncate">
                  {selectedHotel.address}
                </p>
              </div>
            </div>

            {/* Right: Chat, Notifications and Profile */}
            <div className="flex items-center space-x-2 ml-3">
              {/* Chat Button */}
              <ChatProvider
                hotelId={parseInt(params.id as string)}
                guestId={guestId}
              >
                <ChatSheet />
              </ChatProvider>

              <NotificationDrawer />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex items-center space-x-2 hover:bg-blue-50 dark:hover:bg-blue-950"
                  >
                    <div className="w-7 h-7 bg-blue-600 dark:bg-blue-500 rounded-full flex items-center justify-center">
                      <User className="w-3 h-3 text-white" />
                    </div>
                    <div className="text-left hidden sm:block">
                      <p className="text-xs font-medium text-foreground truncate">
                        {guestName}
                      </p>
                      <p className="text-xs text-foreground/70 truncate">
                        {guestEmail}
                      </p>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-56 bg-background border-border"
                >
                  <DropdownMenuLabel className="text-foreground">
                    My Account
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-border" />
                  <DropdownMenuItem
                    onClick={() => router.push("/profile")}
                    className="text-foreground hover:bg-blue-50 dark:hover:bg-blue-950 focus:bg-blue-50 dark:focus:bg-blue-950"
                  >
                    Profile Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => router.push("/notifications")}
                    className="text-foreground hover:bg-blue-50 dark:hover:bg-blue-950 focus:bg-blue-50 dark:focus:bg-blue-950"
                  >
                    Notifications
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleGoBack}
                    className="text-foreground hover:bg-blue-50 dark:hover:bg-blue-950 focus:bg-blue-50 dark:focus:bg-blue-950"
                  >
                    Change Hotel
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-border" />
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="text-foreground hover:bg-blue-50 dark:hover:bg-blue-950 focus:bg-blue-50 dark:focus:bg-blue-950"
                  >
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Bottom Row: Navigation Tabs */}
          <div className="border-t border-gray-100 tabs-container">
            <nav className="flex overflow-x-auto mobile-tabs justify-center sm:justify-start">
              <div className="flex space-x-4 sm:space-x-6 lg:space-x-8 px-6 sm:px-0 min-w-max">
                <button
                  onClick={() => {
                    setActiveTab("current");
                    // If no bookings are loaded yet, fetch them
                    if (currentBookings.length === 0 && !isLoadingBookings) {
                      fetchCurrentBookings();
                    }
                  }}
                  className={`py-4 px-3 sm:px-4 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap flex-shrink-0 touch-manipulation ${
                    activeTab === "current"
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <div className="flex items-center space-x-1 sm:space-x-2">
                    <QrCode className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span>Current Bookings</span>
                    {currentBookings.length > 0 && (
                      <Badge variant="secondary" className="ml-1 text-xs px-1.5 py-0.5">
                        {currentBookings.length}
                      </Badge>
                    )}
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab("new")}
                  className={`py-4 px-3 sm:px-4 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap flex-shrink-0 touch-manipulation ${
                    activeTab === "new"
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <div className="flex items-center space-x-1 sm:space-x-2">
                    <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span>New Booking</span>
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab("history")}
                  className={`py-4 px-3 sm:px-4 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap flex-shrink-0 touch-manipulation ${
                    activeTab === "history"
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <div className="flex items-center space-x-1 sm:space-x-2">
                    <History className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span>History</span>
                  </div>
                </button>
              </div>
            </nav>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {activeTab === "current" && (
          <CurrentBookings
            bookings={currentBookings}
            onNewBooking={() => setActiveTab("new")}
            onViewHistory={() => setActiveTab("history")}
            isLoading={isLoadingBookings}
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

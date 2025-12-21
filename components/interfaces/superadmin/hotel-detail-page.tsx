"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, 
  MapPin, 
  Phone, 
  Mail, 
  Users, 
  Calendar,
  Bus,
  Route,
  BookOpen,
  Clock,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon
} from "lucide-react";
import { SuperadminAPI } from "@/lib/superadmin";
import { UserList } from "./hotel-detail/user-list";
import { BookingList } from "./hotel-detail/booking-list";
import { TripList } from "./hotel-detail/trip-list";
import { LocationList } from "./hotel-detail/location-list";
import { ShuttleList } from "./hotel-detail/shuttle-list";
import PageLayout from "@/components/layout/page-layout";
export function HotelDetailPage({ hotelId }: { hotelId: string }) {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState("users");
  const [hotelData, setHotelData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Fetch hotel images using useQuery like the admin page
  const hotelImageUrls = useQuery(
    api.files.index.getHotelImageUrls,
    hotelData?.hotel?.imageIds && hotelData.hotel.imageIds.length > 0
      ? ({ fileIds: hotelData.hotel.imageIds } as const)
      : "skip"
  );

  const hotelImages = hotelImageUrls?.filter((url): url is string => url !== null) || [];

  useEffect(() => {
    if (session?.user?.id && hotelId) {
      loadHotelDetails();
    }
  }, [session, hotelId]);

  // Sync tab state with URL query parameter
  useEffect(() => {
    const tabFromUrl = searchParams.get("tab");
    if (tabFromUrl && ["users", "shuttles", "locations", "trips", "bookings"].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  // Update URL when tab changes
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    const newUrl = `${window.location.pathname}?tab=${value}`;
    window.history.pushState({}, "", newUrl);
  };

  // Image slider functions
  const goToPreviousImage = () => {
    setCurrentImageIndex((prev) => (prev === 0 ? hotelImages.length - 1 : prev - 1));
  };

  const goToNextImage = () => {
    setCurrentImageIndex((prev) => (prev === hotelImages.length - 1 ? 0 : prev + 1));
  };

  const goToImage = (index: number) => {
    setCurrentImageIndex(index);
  };

  const loadHotelDetails = async () => {
    if (!session?.user?.id || !hotelId) return;

    try {
      setLoading(true);
      const data = await SuperadminAPI.getHotelWithDetails(session.user.id, hotelId);
      setHotelData(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load hotel details");
      setHotelData(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-sm text-muted-foreground">Loading hotel details...</div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200">
        <CardContent className="pt-6">
          <div className="text-red-600 text-sm mb-4">{error}</div>
          <div className="flex gap-2">
            <Button onClick={loadHotelDetails} variant="outline">
              Retry
            </Button>
            <Button onClick={() => router.back()} variant="ghost">
              Go Back
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!hotelData) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <div className="text-muted-foreground">Hotel not found</div>
          <Button onClick={() => router.back()} variant="outline" className="mt-2">
            Go Back
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { hotel, users, shuttles, locations, trips, bookings } = hotelData;

  return (
    <PageLayout
      title={hotel.name} 
      description="Manage hotel and its configurations"
      size="large"
    > 
    <div className="space-y-6">
      {/* Hotel Image Slider - Only show if images exist */}
      {hotelImages.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="relative">
              {/* Main Image */}
              <div className="relative h-64 md:h-80 lg:h-96 overflow-hidden rounded-t-lg">
                <img
                  src={hotelImages[currentImageIndex]}
                  alt={`Hotel image ${currentImageIndex + 1}`}
                  className="w-full h-full object-cover"
                />
                
                {/* Navigation Buttons */}
                {hotelImages.length > 1 && (
                  <>
                    <Button
                      onClick={goToPreviousImage}
                      variant="outline"
                      size="sm"
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={goToNextImage}
                      variant="outline"
                      size="sm"
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </>
                )}
                
                {/* Image Counter */}
                {hotelImages.length > 1 && (
                  <div className="absolute top-4 right-4 bg-black/50 text-white px-2 py-1 rounded text-sm">
                    {currentImageIndex + 1} / {hotelImages.length}
                  </div>
                )}
              </div>
              
              {/* Thumbnail Navigation */}
              {hotelImages.length > 1 && (
                <div className="flex gap-2 p-4 bg-muted/50 overflow-x-auto">
                  {hotelImages.map((image, index) => (
                    <button
                      key={index}
                      onClick={() => goToImage(index)}
                      className={`flex-shrink-0 relative rounded overflow-hidden border-2 transition-all ${
                        index === currentImageIndex 
                          ? 'border-primary ring-2 ring-primary/20' 
                          : 'border-transparent hover:border-muted-foreground'
                      }`}
                    >
                      <img
                        src={image}
                        alt={`Thumbnail ${index + 1}`}
                        className="w-16 h-16 object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Hotel Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Hotel Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{hotel.address}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{hotel.phoneNumber}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{hotel.email}</span>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <Badge variant="outline">{hotel.timeZone}</Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                Coordinates: {hotel.latitude.toFixed(4)}, {hotel.longitude.toFixed(4)}
              </div>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="text-center p-2 bg-muted rounded-lg">
                  <div className="text-lg font-semibold">{users.length}</div>
                  <div className="text-xs text-muted-foreground">Users</div>
                </div>
                <div className="text-center p-2 bg-muted rounded-lg">
                  <div className="text-lg font-semibold">{shuttles.length}</div>
                  <div className="text-xs text-muted-foreground">Shuttles</div>
                </div>
                <div className="text-center p-2 bg-muted rounded-lg">
                  <div className="text-lg font-semibold">{locations.length}</div>
                  <div className="text-xs text-muted-foreground">Locations</div>
                </div>
                <div className="text-center p-2 bg-muted rounded-lg">
                  <div className="text-lg font-semibold">{trips.length}</div>
                  <div className="text-xs text-muted-foreground">Trips</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for different sections */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="shuttles" className="flex items-center gap-2">
            <Bus className="h-4 w-4" />
            Shuttles
          </TabsTrigger>
          <TabsTrigger value="locations" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Locations
          </TabsTrigger>
          <TabsTrigger value="trips" className="flex items-center gap-2">
            <Route className="h-4 w-4" />
            Trips
          </TabsTrigger>
          <TabsTrigger value="bookings" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Bookings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <UserList users={users} hotelId={hotelId} />
        </TabsContent>

        <TabsContent value="shuttles">
          <ShuttleList shuttles={shuttles} />
        </TabsContent>

        <TabsContent value="locations">
          <LocationList locations={locations} />
        </TabsContent>

        <TabsContent value="trips">
          <TripList trips={trips} />
        </TabsContent>

        <TabsContent value="bookings">
          <BookingList bookings={bookings} />
        </TabsContent>
      </Tabs>
    </div>
    </PageLayout>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MapPin, Star, Wifi, Car, Coffee } from "lucide-react";
import { api } from "@/lib/api";

interface Hotel {
  id: number;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}

export default function SelectHotelPage() {
  const [selectedHotel, setSelectedHotel] = useState<number | null>(null);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const router = useRouter();

  useEffect(() => {
    const fetchHotels = async () => {
      const response = await api.get("/guest/hotels");
      console.log(response);
      setHotels(response.hotels as Hotel[]);
    };
    fetchHotels();
  }, []);
  const handleSelectHotel = (hotelId: number) => {
    setSelectedHotel(hotelId);
  };

  const handleContinue = async () => {
    if (selectedHotel) {
      const hotel = hotels.find((h) => h.id === selectedHotel);
      if (hotel) {
        try {
          const response = await api.post("/guest/set-hotel", {
            hotelId: hotel.id,
          });
          console.log(response);
          router.push(`/hotel/${hotel.id}`);
        } catch (error) {
          console.error("Error setting hotel:", error);
        }
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Select Your Hotel
          </h1>
          <p className="text-gray-600">
            Choose your destination to start booking shuttle rides
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {hotels.map((hotel) => (
            <Card
              key={hotel.id}
              className={`cursor-pointer transition-all ${
                selectedHotel === hotel.id
                  ? "ring-2 ring-blue-500 shadow-lg"
                  : "hover:shadow-md"
              }`}
              onClick={() => handleSelectHotel(hotel.id)}
            >
              <CardHeader className="pb-3">
                <div className="aspect-video bg-gray-200 rounded-lg mb-4 overflow-hidden">
                  <img
                    // src={hotel.image || "/placeholder.svg"}
                    src={"/placeholder.svg?height=200&width=300"}
                    alt={hotel.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{hotel.name}</CardTitle>
                    <CardDescription className="flex items-center mt-1">
                      <MapPin className="w-4 h-4 mr-1" />
                      {hotel.address}
                    </CardDescription>
                  </div>
                  {/* <div className="flex items-center space-x-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm font-medium">{hotel.rating}</span>
                  </div> */}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {/* <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
                  <span>{hotel.distance}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {hotel.amenities.map((amenity, index) => (
                    <div key={index} className="flex items-center space-x-1 text-xs bg-gray-100 px-2 py-1 rounded">
                      {getAmenityIcon(amenity)}
                      <span>{amenity}</span>
                    </div>
                  ))}
                </div> */}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center">
          <Button
            onClick={handleContinue}
            disabled={!selectedHotel}
            size="lg"
            className="px-8"
          >
            Continue to Booking
          </Button>
        </div>
      </div>
    </div>
  );
}

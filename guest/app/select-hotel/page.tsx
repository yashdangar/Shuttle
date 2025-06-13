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

// address
// :
// "Taj Mahal Palace, Prem J. Ramchandani Road, Apollo Bandar, A Ward, Zone 1, Mumbai City, Maharashtra, 400001, India"
// createdAt
// :
// "2025-06-11T10:07:57.540Z"
// id
// :
// 6
// latitude
// :
// 18.92202
// longitude
// :
// 72.83335
// name
// :
// "Hotel"
// updatedAt
// :
// "2025-06-13T12:21:22.445Z"
interface Hotel {
  id: number;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  // rating: number
  // image: string
  // amenities: string[]
  // distance: string
}
// const hotels = [
//   {
//     id: 1,
//     name: "Grand Plaza Hotel",
//     address: "123 Downtown Ave, City Center",
//     rating: 4.8,
//     image: "/placeholder.svg?height=200&width=300",
//     amenities: ["Free WiFi", "Parking", "Restaurant"],
//     distance: "2.5 km from airport",
//   },
//   {
//     id: 2,
//     name: "Ocean View Resort",
//     address: "456 Beachfront Blvd, Coastal Area",
//     rating: 4.6,
//     image: "/placeholder.svg?height=200&width=300",
//     amenities: ["Free WiFi", "Spa", "Pool"],
//     distance: "15 km from airport",
//   },
//   {
//     id: 3,
//     name: "Business Center Inn",
//     address: "789 Corporate St, Business District",
//     rating: 4.4,
//     image: "/placeholder.svg?height=200&width=300",
//     amenities: ["Free WiFi", "Gym", "Conference Rooms"],
//     distance: "8 km from airport",
//   },
//   {
//     id: 4,
//     name: "Mountain Lodge",
//     address: "321 Highland Rd, Mountain View",
//     rating: 4.7,
//     image: "/placeholder.svg?height=200&width=300",
//     amenities: ["Free WiFi", "Hiking Trails", "Restaurant"],
//     distance: "25 km from airport",
//   },
// ]

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
        // localStorage.setItem("hotelId", hotel.id.toString())
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

  const getAmenityIcon = (amenity: string) => {
    switch (amenity) {
      case "Free WiFi":
        return <Wifi className="w-4 h-4" />;
      case "Parking":
        return <Car className="w-4 h-4" />;
      case "Restaurant":
        return <Coffee className="w-4 h-4" />;
      default:
        return <Star className="w-4 h-4" />;
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

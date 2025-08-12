"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Search, CheckCircle2, Hotel, Loader2 } from "lucide-react";
import { api } from "@/lib/api";

interface Hotel {
  id: number;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  imageUrl?: string;
}

function SelectHotelSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-5xl px-4 pt-10 pb-6">
        <div className="rounded-2xl border border-gray-200 bg-white px-6 py-8 shadow-sm md:px-10">
          <div className="flex items-center justify-center">
            <Skeleton className="h-4 w-24 rounded-full" />
          </div>
          <div className="mt-3 text-center">
            <Skeleton className="mx-auto h-8 w-64 rounded-md" />
            <Skeleton className="mx-auto mt-2 h-4 w-80" />
          </div>

          <div className="mx-auto mt-6 max-w-3xl">
            <Skeleton className="h-11 w-full rounded-xl" />
            <div className="mt-3 flex items-center justify-center gap-2">
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 pb-16">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="overflow-hidden rounded-[14px] border border-gray-100 bg-white">
              <div className="aspect-video w-full">
                <Skeleton className="h-full w-full" />
              </div>
              <CardHeader className="space-y-2 pb-2">
                <Skeleton className="h-5 w-40" />
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4 rounded-sm" />
                  <Skeleton className="h-4 w-64" />
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-6 w-28 rounded-full" />
                  <Skeleton className="h-8 w-20 rounded-md" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function SelectHotelPage() {
  const [selectedHotel, setSelectedHotel] = useState<number | null>(null);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  // Motion variants
  const heroVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
  } as const;
  const listVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
  } as const;
  const itemVariants = {
    hidden: { opacity: 0, y: 14 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
  } as const;

  useEffect(() => {
    const fetchHotels = async () => {
      try {
        setIsLoading(true);
        const response = await api.get("/guest/hotels");
        console.log(response);
        setHotels(response.hotels as Hotel[]);
      } catch (error) {
        console.error("Error fetching hotels:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchHotels();
  }, []);

  const handleSelectHotel = (hotelId: number) => {
    setSelectedHotel(hotelId);
  };

  const handleContinue = async () => {
    if (isSubmitting) return;
    if (selectedHotel) {
      const hotel = hotels.find((h) => h.id === selectedHotel);
      if (hotel) {
        try {
          setIsSubmitting(true);
          const response = await api.post("/guest/set-hotel", {
            hotelId: hotel.id,
          });
          console.log(response);
          router.push(`/hotel/${hotel.id}`);
        } catch (error) {
          console.error("Error setting hotel:", error);
        } finally {
          setIsSubmitting(false);
        }
      }
    }
  };

  const filteredHotels = useMemo(() => {
    if (!searchQuery.trim()) return hotels;
    const q = searchQuery.toLowerCase();
    return hotels.filter((h) =>
      [h.name, h.address].some((v) => v?.toLowerCase().includes(q))
    );
  }, [hotels, searchQuery]);

  // Sorting removed per request; we use filteredHotels directly

  if (isLoading) {
    return <SelectHotelSkeleton />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="relative">
        <div className="mx-auto max-w-5xl px-4 pt-10 pb-6">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={heroVariants}
            className="rounded-2xl border border-gray-200 shadow-sm"
          >
            <div className="rounded-2xl bg-white px-6 py-8 md:px-10">
              <div className="flex items-center justify-center gap-3 text-indigo-700">
                <Hotel className="h-5 w-5" />
                <span className="text-xs font-semibold tracking-wider uppercase">
                  Plan your ride
                </span>
              </div>
              <h1 className="mt-3 text-center text-3xl font-extrabold tracking-tight text-indigo-800 md:text-4xl">
                Select your hotel
              </h1>
              <p className="mt-2 text-center text-gray-600">
                Choose your destination to start booking shuttle rides
              </p>

              <motion.div
                initial="hidden"
                animate="visible"
                variants={heroVariants}
                className="mx-auto mt-6 max-w-3xl"
              >
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by hotel name or address"
                    className="h-11 rounded-xl border-gray-200 pl-10 focus-visible:ring-indigo-500"
                  />
                </div>
                <div className="mt-3 flex items-center justify-center gap-2">
                  <Badge variant="secondary" className="rounded-full">
                    {filteredHotels.length} results
                  </Badge>
                  {selectedHotel && (
                    <Badge className="rounded-full bg-indigo-600 text-white hover:bg-indigo-600">
                      1 selected
                    </Badge>
                  )}
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 pb-16">
        {filteredHotels.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="mt-10 flex flex-col items-center justify-center rounded-2xl border border-dashed bg-white p-10 text-center"
          >
            <Search className="h-10 w-10 text-gray-400" />
            <h3 className="mt-3 text-lg font-semibold text-gray-900">No hotels found</h3>
            <p className="mt-1 max-w-md text-sm text-gray-600">
              Try adjusting your search. We couldn't find any hotels matching "{searchQuery}".
            </p>
          </motion.div>
        ) : (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={listVariants}
            className="grid grid-cols-1 gap-6 md:grid-cols-2"
          >
            {filteredHotels.map((hotel) => {
              const isSelected = selectedHotel === hotel.id;
              return (
                <motion.div
                  key={hotel.id}
                  variants={itemVariants}
                  whileHover={{ y: -3, scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className="group rounded-2xl transition-all"
                  onClick={() => handleSelectHotel(hotel.id)}
                >
                  <Card
                    className={`relative cursor-pointer overflow-hidden rounded-[14px] border bg-white transition-all hover:shadow-lg ${
                      isSelected ? "ring-2 ring-indigo-500 border-indigo-200" : "border-gray-100"
                    }`}
                  >
                    <div className="relative aspect-video overflow-hidden">
                      <img
                        src={hotel.imageUrl || "/placeholder.svg?height=320&width=480"}
                        alt={hotel.name}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = "/placeholder.svg?height=320&width=480";
                        }}
                      />
                      {isSelected && (
                        <motion.div
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ type: "spring", stiffness: 300, damping: 20 }}
                          className="absolute right-3 top-3 rounded-full bg-white/90 p-1.5 shadow"
                        >
                          <CheckCircle2 className="h-5 w-5 text-indigo-600" />
                        </motion.div>
                      )}
                    </div>

                    <CardHeader className="space-y-1 pb-2">
                      <CardTitle className="text-lg font-semibold text-gray-900">
                        {hotel.name}
                      </CardTitle>
                      <CardDescription className="flex items-center text-gray-600">
                        <MapPin className="mr-1.5 h-4 w-4 text-gray-400" />
                        <span className="line-clamp-1">{hotel.address}</span>
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="rounded-full">
                            {hotel.latitude.toFixed(2)}, {hotel.longitude.toFixed(2)}
                          </Badge>
                        </div>
                        <Button
                          variant={isSelected ? "default" : "secondary"}
                          size="sm"
                          className="transition"
                        >
                          {isSelected ? "Selected" : "Choose"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        )}

        <AnimatePresence>
          {selectedHotel && (
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="pointer-events-none fixed inset-x-0 bottom-0 z-30 mx-auto mb-4 w-full max-w-5xl px-4"
            >
              <div className="pointer-events-auto rounded-2xl bg-white/90 p-3 shadow-xl ring-1 ring-black/5 backdrop-blur supports-[backdrop-filter]:bg-white/70">
                {(() => {
                  const hotel =
                    filteredHotels.find((h) => h.id === selectedHotel) ||
                    hotels.find((h) => h.id === selectedHotel);
                  if (!hotel) return null;
                  return (
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="h-10 w-16 overflow-hidden rounded-md">
                          <img
                            src={hotel.imageUrl || "/placeholder.svg?height=80&width=120"}
                            alt={hotel.name}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = "/placeholder.svg?height=80&width=120";
                            }}
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-gray-900">{hotel.name}</p>
                          <p className="truncate text-xs text-gray-600">{hotel.address}</p>
                        </div>
                      </div>
                      <motion.div
                        whileTap={{ scale: 0.98 }}
                        animate={{ scale: isSubmitting ? 0.97 : 1, opacity: isSubmitting ? 0.9 : 1 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      >
                        <Button
                          onClick={handleContinue}
                          className="px-6"
                          disabled={isSubmitting}
                          aria-busy={isSubmitting}
                        >
                          {isSubmitting && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          {isSubmitting ? "Continuing..." : "Continue"}
                        </Button>
                      </motion.div>
                    </div>
                  );
                })()}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

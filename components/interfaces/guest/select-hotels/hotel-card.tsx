"use client";

import { motion } from "motion/react";
import { CheckCircle2, MapPin } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import type { HotelRecord } from "@/convex/hotels";

type HotelCardProps = {
  hotel: HotelRecord & { imageUrls?: string[] };
  isSelected: boolean;
  onSelect: () => void;
};

export function HotelCard({ hotel, isSelected, onSelect }: HotelCardProps) {
  const imageUrls = hotel.imageUrls || [];
  const hasImages = imageUrls.length > 0;
  const hasMultipleImages = imageUrls.length > 1;

  return (
    <motion.div
      whileHover={{ y: -3, scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      className="group rounded-2xl transition-all"
      onClick={onSelect}
    >
      <Card
        className={`relative cursor-pointer overflow-hidden rounded-[14px] border bg-white transition-all hover:shadow-lg ${
          isSelected
            ? "border-violet-200 ring-2 ring-violet-500"
            : "border-gray-100"
        }`}
      >
        <div className="relative aspect-video overflow-hidden">
          {hasImages && hasMultipleImages ? (
            <Carousel className="h-full w-full">
              <CarouselContent className="h-full">
                {imageUrls.map((url, index) => (
                  <CarouselItem key={index} className="h-full pl-0">
                    <img
                      src={url}
                      alt={`${hotel.name} - Image ${index + 1}`}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                      onError={(event) => {
                        const target = event.target as HTMLImageElement;
                        target.src = "/placeholder.svg?height=320&width=480";
                      }}
                    />
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white border-gray-200" />
              <CarouselNext className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white border-gray-200" />
            </Carousel>
          ) : hasImages ? (
            <img
              src={imageUrls[0]}
              alt={hotel.name}
              className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
              onError={(event) => {
                const target = event.target as HTMLImageElement;
                target.src = "/placeholder.svg?height=320&width=480";
              }}
            />
          ) : (
            <img
              src="/placeholder.svg?height=320&width=480"
              alt={hotel.name}
              className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
            />
          )}
          {isSelected && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="absolute right-3 top-3 rounded-full bg-white/90 p-1.5 shadow z-10"
            >
              <CheckCircle2 className="h-5 w-5 text-violet-600" />
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
            <Badge variant="secondary" className="rounded-full">
              {hotel.latitude.toFixed(2)}, {hotel.longitude.toFixed(2)}
            </Badge>
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
}


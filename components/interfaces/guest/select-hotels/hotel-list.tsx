"use client";

import { motion, AnimatePresence } from "motion/react";
import { Search } from "lucide-react";
import { HotelCard } from "./hotel-card";
import type { HotelRecord } from "@/convex/hotels";

type HotelListProps = {
  hotels: (HotelRecord & { imageUrls?: string[] })[];
  selectedHotelSlug: string | null;
  onSelectHotel: (hotelSlug: string) => void;
  searchQuery: string;
};

export function HotelList({
  hotels,
  selectedHotelSlug,
  onSelectHotel,
  searchQuery,
}: HotelListProps) {
  const listVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
  } as const;

  const itemVariants = {
    hidden: { opacity: 0, y: 14 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
  } as const;

  if (hotels.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="mt-10 flex flex-col items-center justify-center rounded-2xl border border-dashed bg-white p-10 text-center"
      >
        <Search className="h-10 w-10 text-gray-400" />
        <h3 className="mt-3 text-lg font-semibold text-gray-900">
          No hotels found
        </h3>
        <p className="mt-1 max-w-md text-sm text-gray-600">
          Try adjusting your search. We couldn't find any hotels matching "
          {searchQuery}".
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={listVariants}
      className="grid grid-cols-1 gap-6 md:grid-cols-2"
    >
      {hotels.map((hotel) => (
        <motion.div key={hotel.id} variants={itemVariants}>
          <HotelCard
            hotel={hotel}
            isSelected={selectedHotelSlug === hotel.slug}
            onSelect={() => onSelectHotel(hotel.slug)}
          />
        </motion.div>
      ))}
    </motion.div>
  );
}


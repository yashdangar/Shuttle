"use client";

import { motion, AnimatePresence } from "motion/react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { HotelRecord } from "@/convex/hotels";

type SelectedHotelBarProps = {
  hotel: HotelRecord & { imageUrl?: string | null };
  isSubmitting: boolean;
  onContinue: () => void;
};

export function SelectedHotelBar({
  hotel,
  isSubmitting,
  onContinue,
}: SelectedHotelBarProps) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="pointer-events-none fixed inset-x-0 bottom-0 z-30 mx-auto mb-4 w-full max-w-5xl px-4"
      >
        <div className="pointer-events-auto rounded-2xl bg-white/90 p-3 shadow-xl ring-1 ring-black/5 backdrop-blur supports-backdrop-filter:bg-white/70">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="h-10 w-16 overflow-hidden rounded-md">
                <img
                  src={hotel.imageUrl || "/placeholder.svg?height=80&width=120"}
                  alt={hotel.name}
                  className="h-full w-full object-cover"
                  onError={(event) => {
                    const target = event.target as HTMLImageElement;
                    target.src = "/placeholder.svg?height=80&width=120";
                  }}
                />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-gray-900">
                  {hotel.name}
                </p>
                <p className="truncate text-xs text-gray-600">
                  {hotel.address}
                </p>
              </div>
            </div>

            <motion.div
              whileTap={{ scale: 0.98 }}
              animate={{
                scale: isSubmitting ? 0.97 : 1,
                opacity: isSubmitting ? 0.9 : 1,
              }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              <Button
                onClick={onContinue}
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
        </div>
      </motion.div>
    </AnimatePresence>
  );
}


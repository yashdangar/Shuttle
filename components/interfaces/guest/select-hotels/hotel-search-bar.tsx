"use client";

import { motion } from "motion/react";
import { Search, Hotel as HotelIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type HotelSearchBarProps = {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  resultCount: number;
  hasSelection: boolean;
};

export function HotelSearchBar({
  searchQuery,
  onSearchChange,
  resultCount,
  hasSelection,
}: HotelSearchBarProps) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0, y: 16 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
      }}
      className="rounded-2xl border border-gray-200 shadow-sm"
    >
      <div className="rounded-2xl bg-white px-6 py-8 md:px-10">
        <div className="flex items-center justify-center gap-3 text-violet-700">
          <HotelIcon className="h-5 w-5" />
          <span className="text-xs font-semibold uppercase tracking-wider">
            Plan your ride
          </span>
        </div>
        <h1 className="mt-3 text-center text-3xl font-extrabold tracking-tight text-violet-800 md:text-4xl">
          Select your hotel
        </h1>
        <p className="mt-2 text-center text-gray-600">
          Choose your destination to start booking shuttle rides
        </p>
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0, y: 16 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
          }}
          className="mx-auto mt-6 max-w-3xl"
        >
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search by hotel name or address"
              className="h-11 rounded-xl border-gray-200 pl-10 focus-visible:ring-indigo-500"
            />
          </div>
          <div className="mt-3 flex items-center justify-center gap-2">
            <Badge variant="secondary" className="rounded-full">
              {resultCount} results
            </Badge>
            {hasSelection && (
              <Badge className="rounded-full bg-violet-600 text-white hover:bg-violet-600">
                1 selected
              </Badge>
            )}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}


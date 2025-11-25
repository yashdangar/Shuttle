"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { SelectHotelSkeleton } from "@/components/interfaces/guest/select-hotels/select-hotel-skeleton";
import { HotelSearchBar } from "@/components/interfaces/guest/select-hotels/hotel-search-bar";
import { HotelList } from "@/components/interfaces/guest/select-hotels/hotel-list";
import { SelectedHotelBar } from "@/components/interfaces/guest/select-hotels/selected-hotel-bar";
import type { HotelRecord } from "@/convex/hotels";

export default function SelectHotelPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [selectedHotelSlug, setSelectedHotelSlug] = useState<string | null>(
    null
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hotelsData = useQuery(api.hotels.index.listHotels, { limit: 100 });
  const isLoading = hotelsData === undefined;

  const hotelsWithImages = useMemo(() => {
    if (!hotelsData) return [];
    return hotelsData.map((hotel) => ({
      ...hotel,
      imageUrl: null as string | null,
    }));
  }, [hotelsData]);

  const filteredHotels = useMemo(() => {
    if (!searchQuery.trim()) return hotelsWithImages;
    const q = searchQuery.toLowerCase();
    return hotelsWithImages.filter((hotel) =>
      [hotel.name, hotel.address].some((value) =>
        value?.toLowerCase().includes(q)
      )
    );
  }, [hotelsWithImages, searchQuery]);

  const selectedHotel = useMemo(
    () =>
      hotelsWithImages.find((hotel) => hotel.slug === selectedHotelSlug) ||
      null,
    [hotelsWithImages, selectedHotelSlug]
  );

  const handleSelectHotel = (hotelSlug: string) => {
    setSelectedHotelSlug(hotelSlug);
  };

  const handleContinue = () => {
    if (isSubmitting || !selectedHotel) return;

    setIsSubmitting(true);
    if (session?.user) {
      router.push(`/new-booking/${selectedHotel.slug}`);
    } else {
      router.push(`/sign-in?redirect=/new-booking/${selectedHotel.slug}`);
    }
    setIsSubmitting(false);
  };

  if (isLoading) {
    return <SelectHotelSkeleton />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="relative">
        <div className="mx-auto max-w-5xl px-4 pt-10 pb-6">
          <HotelSearchBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            resultCount={filteredHotels.length}
            hasSelection={!!selectedHotel}
          />
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 pb-16">
        <HotelList
          hotels={filteredHotels}
          selectedHotelSlug={selectedHotelSlug}
          onSelectHotel={setSelectedHotelSlug}
          searchQuery={searchQuery}
        />

        {selectedHotel && (
          <SelectedHotelBar
            hotel={selectedHotel}
            isSubmitting={isSubmitting}
            onContinue={handleContinue}
          />
        )}
      </div>
    </div>
  );
}

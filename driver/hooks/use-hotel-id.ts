import { useState, useEffect } from "react";
import { useDriverProfile } from "@/context/DriverProfileContext";

export function useHotelId() {
  const [hotelId, setHotelId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const { profile } = useDriverProfile();

  useEffect(() => {
    if (profile) {
      console.log("profile", profile);
      setHotelId(profile.hotelId);
      setLoading(false);
    }
  }, [profile]);

  return { hotelId, loading };
}

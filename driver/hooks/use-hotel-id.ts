import { useState, useEffect } from "react";
import { useDriverProfile } from "./use-driver-profile";

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

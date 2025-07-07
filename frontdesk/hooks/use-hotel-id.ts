import { useState, useEffect } from "react";
import { jwtDecode } from "jwt-decode";

interface DecodedToken {
  userId: number;
  role: string;
  hotelId: number;
}

export function useHotelId() {
  const [hotelId, setHotelId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("frontdeskToken");
    if (token) {
      try {
        const decoded = jwtDecode<DecodedToken>(token);
        setHotelId(decoded.hotelId);
      } catch (error) {
        console.error("Error decoding token:", error);
        setHotelId(null);
      }
    } else {
      setHotelId(null);
    }
    setLoading(false);
  }, []);

  return { hotelId, loading };
}

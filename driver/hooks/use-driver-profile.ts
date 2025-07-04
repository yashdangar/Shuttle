import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface DriverProfile {
  id: number;
  name: string;
  email: string;
  phoneNumber: string;
  hotelId: number;
  createdAt: string;
  hotel?: {
    id: number;
    name: string;
    address: string;
  };
}

export function useDriverProfile() {
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.get("/driver/profile");
      setProfile(data.driver);
    } catch (err: any) {
      console.error("Error fetching driver profile:", err);
      setError(err.message || "Failed to fetch profile");
      toast.error("Failed to load profile data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const updateProfile = async (updates: Partial<DriverProfile>) => {
    try {
      const updatedData = await api.put("/driver/profile", updates);
      setProfile(updatedData.driver);
      toast.success("Profile updated successfully");
      return updatedData.driver;
    } catch (err: any) {
      console.error("Error updating profile:", err);
      toast.error("Failed to update profile");
      throw err;
    }
  };

  return {
    profile,
    loading,
    error,
    fetchProfile,
    updateProfile,
  };
} 
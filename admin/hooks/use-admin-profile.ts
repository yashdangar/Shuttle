"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { UserProfile, defaultUserProfile } from "@/config/navigation";

export function useAdminProfile() {
  const [profile, setProfile] = useState<UserProfile>(defaultUserProfile);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get("/admin");
      
      if (response.admin) {
        setProfile({
          name: response.admin.name || "Admin User",
          email: response.admin.email || "admin@shuttle.com",
          role: "Administrator",
          avatar: undefined, // You can add avatar support later
        });
      }
    } catch (error) {
      console.error("Error fetching admin profile:", error);
      setError("Failed to load profile");
      // Keep default profile on error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  return {
    profile,
    loading,
    error,
    refetch: fetchProfile,
  };
} 
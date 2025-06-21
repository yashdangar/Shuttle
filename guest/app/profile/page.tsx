"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton, ProfileSkeleton } from "@/components/ui/skeleton";
import {
  User,
  Phone,
  Mail,
  Calendar,
  Clock,
  LogOut,
  Moon,
  Sun,
  Star,
  MapPin,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/lib/api";

interface ProfileData {
  guest: {
    id: number;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    phoneNumber: string | null;
    createdAt: string;
    hotel: {
      id: number;
      name: string;
      address: string | null;
    } | null;
  };
  statistics: {
    totalRides: number;
    completedRides: number;
    hotelsVisited: number;
    averageRating: number;
  };
  recentBookings: Array<{
    id: string;
    route: string;
    date: string;
    time: string;
    status: string;
  }>;
}

export default function ProfilePage() {
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { theme, setTheme } = useTheme();
  const router = useRouter();

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem("guestToken");
      if (!token) {
        router.push("/login");
        return;
      }

      const data = await api.get("/guest/profile");
      setProfileData(data);
      toast.success("Profile loaded successfully");
    } catch (err: any) {
      console.error("Error fetching profile:", err);
      setError(err.message || "Failed to load profile");
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("guestToken");
    toast.success("Logged out successfully");
    router.push("/login");
  };

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    toast.success(`Switched to ${newTheme} mode`);
  };

  if (loading) {
    return <ProfileSkeleton />;
  }

  if (error) {
    return (
      <div className="space-y-6 p-6">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-foreground">Error Loading Profile</h1>
          <p className="text-foreground/70">{error}</p>
          <Button onClick={fetchProfileData}>Try Again</Button>
        </div>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="space-y-6 p-6">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-foreground">No Profile Data</h1>
          <p className="text-foreground/70">Unable to load profile information</p>
        </div>
      </div>
    );
  }

  const { guest, statistics, recentBookings } = profileData;
  const fullName = `${guest.firstName || ''} ${guest.lastName || ''}`.trim() || 'Guest User';
  const memberSince = new Date(guest.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long'
  });

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <h1 className="text-3xl font-bold text-foreground">Guest Profile</h1>

      {/* Profile Information */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 bg-blue-600 dark:bg-blue-500 rounded-2xl flex items-center justify-center">
              <User className="h-10 w-10 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-foreground">{fullName}</h3>
              <p className="text-foreground/70 font-medium">
                Valued Guest
              </p>
              <div className="flex items-center gap-2 mt-1">
                <Star className="h-4 w-4 text-blue-600 dark:text-blue-400 fill-current" />
                <span className="text-sm font-medium text-foreground">Premium Member</span>
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="flex items-center gap-3 p-3 bg-background rounded-lg border border-border hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
              <Phone className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <span className="font-medium text-foreground">
                {guest.phoneNumber || "Phone number not provided"}
              </span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-background rounded-lg border border-border hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
              <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <span className="font-medium text-foreground">
                {guest.email || "Email not provided"}
              </span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-background rounded-lg border border-border hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
              <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <span className="font-medium text-foreground">
                Member since {memberSince}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Travel Stats */}
      {/* <Card className="border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Star className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            Travel Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-950 rounded-xl">
              <p className="text-3xl font-bold text-foreground">{statistics.totalRides}</p>
              <p className="text-sm text-foreground/70">Total Rides</p>
            </div>
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-950 rounded-xl">
              <p className="text-3xl font-bold text-foreground">{statistics.hotelsVisited}</p>
              <p className="text-sm text-foreground/70">Hotels Visited</p>
            </div>
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-950 rounded-xl">
              <p className="text-3xl font-bold text-foreground">{statistics.averageRating}</p>
              <p className="text-sm text-foreground/70">Average Rating</p>
            </div>
          </div>
        </CardContent>
      </Card> */}

      {/* Settings */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-950 rounded-xl">
            <div className="flex items-center gap-3">
              <LogOut className="h-5 w-5 text-destructive" />
              <span className="font-medium text-foreground">Account</span>
            </div>
            <Button variant="destructive" size="sm" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 
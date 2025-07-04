"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Edit,
  Save,
  X,
  MapPin,
  Phone,
  Mail,
  Building,
  Eye,
  EyeOff,
} from "lucide-react";
import { fetchWithAuth } from "@/lib/api";
import { withAuth } from "@/components/withAuth";
import { SoundSettings } from "@/components/sound-settings";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface FrontdeskProfile {
  id: number;
  name: string;
  email: string;
  phoneNumber: string;
  hotelId: number;
  createdAt: string;
}

interface HotelData {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
}

function ProfilePage() {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<FrontdeskProfile | null>(null);
  const [hotelData, setHotelData] = useState<HotelData | null>(null);

  const [showChangePassword, setShowChangePassword] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [changing, setChanging] = useState(false);

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const response = await fetchWithAuth("/frontdesk/profile");
        const data = await response.json();
        setProfileData(data.frontdesk);
        setHotelData(data.hotel);
      } catch (error) {
        console.error("Error fetching profile data:", error);
        toast.error("Failed to load profile data. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, []);

  const handleSave = async () => {
    if (!profileData) return;

    try {
      const response = await fetchWithAuth("/frontdesk/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: profileData.name,
          phoneNumber: profileData.phoneNumber,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update profile");
      }

      setIsEditing(false);
      toast.success("Your profile information has been successfully updated.");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile. Please try again.");
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Reset form data if needed
  };

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      toast.error("All fields are required");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setChanging(true);
    try {
      const response = await fetchWithAuth("/frontdesk/change-password", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ oldPassword, newPassword }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to change password");
      }

      toast.success("Your password has been updated.");
      setShowChangePassword(false);
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast.error(error.message || "Failed to change password.");
    } finally {
      setChanging(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
          <p className="text-gray-600">
            Manage your personal information and hotel details
          </p>
        </div>

        {/* Profile Card Skeleton */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Personal Information</CardTitle>
            <Skeleton className="h-10 w-32" />
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex flex-col items-center md:items-start">
                <Skeleton className="h-24 w-24 rounded-full mb-4" />
                <Skeleton className="h-6 w-32 mb-2" />
                <Skeleton className="h-4 w-24" />
              </div>
              <div className="flex-1 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-4 w-4" />
                      <Skeleton className="h-4 w-48" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Hotel Details Card Skeleton */}
        <Card>
          <CardHeader>
            <CardTitle>Hotel Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <Skeleton className="h-6 w-6 mt-1" />
                <div className="flex-1">
                  <Skeleton className="h-6 w-48 mb-2" />
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-4" />
                    <Skeleton className="h-4 w-64" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Skeleton className="h-4 w-4" />
                    <Skeleton className="h-4 w-12" />
                  </div>
                  <Skeleton className="h-5 w-32" />
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Skeleton className="h-4 w-4" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                  <Skeleton className="h-5 w-28" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!profileData || !hotelData) {
    return <div>No profile data available</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
        <p className="text-gray-600">
          Manage your personal information and hotel details
        </p>
      </div>

      {/* User Profile Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Personal Information</CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowChangePassword(true)}
            >
              Change Password
            </Button>
            {!isEditing ? (
              <Button variant="outline" onClick={() => setIsEditing(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleCancel}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button onClick={handleSave}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex flex-col items-center md:items-start">
              <Avatar className="h-24 w-24 mb-4">
                <AvatarImage src="/placeholder-user.jpg" alt="Profile" />
                <AvatarFallback className="text-2xl">
                  {profileData.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
              <h2 className="text-xl font-semibold text-center md:text-left">
                {profileData.name}
              </h2>
              <p className="text-gray-600 text-center md:text-left">
                Front Desk Staff
              </p>
            </div>
            <div className="flex-1 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  {isEditing ? (
                    <Input
                      id="name"
                      value={profileData.name}
                      onChange={(e) =>
                        setProfileData({ ...profileData, name: e.target.value })
                      }
                    />
                  ) : (
                    <p className="text-gray-900 font-medium">
                      {profileData.name}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="position">Position</Label>
                  <p className="text-gray-900 font-medium">Front Desk Staff</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-500" />
                    <p className="text-gray-900 font-medium">
                      {profileData.email}
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  {isEditing ? (
                    <Input
                      id="phone"
                      type="tel"
                      value={profileData.phoneNumber}
                      onChange={(e) =>
                        setProfileData({
                          ...profileData,
                          phoneNumber: e.target.value,
                        })
                      }
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-500" />
                      <p className="text-gray-900 font-medium">
                        {profileData.phoneNumber}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Change Password Modal */}
      <Dialog open={showChangePassword} onOpenChange={setShowChangePassword}>
        <DialogContent className="max-w-md w-full">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="oldPassword">Old Password</Label>
              <div className="relative">
                <Input
                  id="oldPassword"
                  type={showOld ? "text" : "password"}
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="absolute right-2 top-2 text-gray-500"
                  onClick={() => setShowOld((v) => !v)}
                  tabIndex={-1}
                >
                  {showOld ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="absolute right-2 top-2 text-gray-500"
                  onClick={() => setShowNew((v) => !v)}
                  tabIndex={-1}
                >
                  {showNew ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="absolute right-2 top-2 text-gray-500"
                  onClick={() => setShowConfirm((v) => !v)}
                  tabIndex={-1}
                >
                  {showConfirm ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setShowChangePassword(false)}
              disabled={changing}
            >
              Cancel
            </Button>
            <Button onClick={handleChangePassword} disabled={changing}>
              Change Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hotel Details Card */}
      <Card>
        <CardHeader>
          <CardTitle>Hotel Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <Building className="h-6 w-6 text-blue-600 mt-1" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">
                  {hotelData.name}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <MapPin className="h-4 w-4 text-gray-500" />
                  <p className="text-gray-600">
                    Latitude: {hotelData.latitude}, Longitude:{" "}
                    {hotelData.longitude}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-600">
                    Email
                  </span>
                </div>
                <p className="font-semibold">{profileData.email}</p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Phone className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-600">
                    Phone
                  </span>
                </div>
                <p className="font-semibold">{profileData.phoneNumber}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sound Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <SoundSettings />
        </CardContent>
      </Card>
    </div>
  );
}

export default withAuth(ProfilePage);

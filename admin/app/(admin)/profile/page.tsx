"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Edit,
  Save,
  X,
  MapPin,
  Phone,
  Mail,
  Building,
  Shield,
  Eye,
  EyeOff,
} from "lucide-react";
import { api } from "@/lib/api";
import { withAuth } from "@/components/withAuth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface AdminProfile {
  id: number;
  name: string;
  email: string;
  hotelId: number | null;
  createdAt: string;
  updatedAt: string;
}

interface HotelData {
  id: number;
  name: string;
  address: string | null;
  phoneNumber: string | null;
  email: string | null;
  latitude: number | null;
  longitude: number | null;
}

function ProfilePage() {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<AdminProfile | null>(null);
  const [hotelData, setHotelData] = useState<HotelData | null>(null);
  const { toast } = useToast();
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
        const data = await api.get("/admin/profile");
        setProfileData(data.admin);
        setHotelData(data.hotel);
      } catch (error) {
        console.error("Error fetching profile data:", error);
        toast({
          title: "Error",
          description: "Failed to load profile data. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [toast]);

  const handleSave = async () => {
    if (!profileData) return;

    try {
      const updatedData = await api.put("/admin/profile", {
        name: profileData.name,
      });

      setProfileData(updatedData.admin);
      setIsEditing(false);
      toast({
        title: "Profile Updated",
        description: "Your profile information has been successfully updated.",
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      toast({
        title: "All fields are required",
        variant: "destructive",
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }
    setChanging(true);
    try {
      const token = localStorage.getItem("adminToken");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/change-password`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ oldPassword, newPassword }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to change password.");
      }
      toast({
        title: "Password changed successfully",
        description: "Your password has been updated.",
      });
      setShowChangePassword(false);
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to change password.",
        variant: "destructive",
      });
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
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!profileData) {
    return <div>No profile data available</div>;
  }

  return (
    <div className="space-y-8 max-w-3xl mx-auto py-8">
      <div className="mb-4">
        <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
        <p className="text-gray-600 text-lg">
          Manage your personal information and hotel details
        </p>
      </div>

      <Card className="shadow-lg border-0">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-xl">Personal Information</CardTitle>
          </div>
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
          <div className="flex flex-col md:flex-row gap-8">
            <div className="flex flex-col items-center md:items-start">
              <Avatar className="h-24 w-24 mb-4 shadow">
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
              <p className="text-gray-600 text-center md:text-left flex items-center gap-1">
                <Shield className="h-4 w-4" />
                Hotel Administrator
              </p>
            </div>
            <div className="flex-1 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  <p className="text-gray-900 font-medium flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Hotel Administrator
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  <Label htmlFor="memberSince">Member Since</Label>
                  <p className="text-gray-900 font-medium">
                    {new Date(profileData.createdAt).toLocaleDateString()}
                  </p>
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

      {hotelData && (
        <Card className="shadow-lg border-0">
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
                  {hotelData.address && (
                    <div className="flex items-center gap-2 mt-1">
                      <MapPin className="h-4 w-4 text-gray-500" />
                      <p className="text-gray-600">{hotelData.address}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {hotelData.email && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Mail className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-600">
                        Hotel Email
                      </span>
                    </div>
                    <p className="font-semibold">{hotelData.email}</p>
                  </div>
                )}

                {hotelData.phoneNumber && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Phone className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-600">
                        Hotel Phone
                      </span>
                    </div>
                    <p className="font-semibold">{hotelData.phoneNumber}</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!hotelData && (
        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle>Hotel Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No Hotel Assigned
              </h3>
              <p className="text-gray-600">
                You are not currently assigned to any hotel. Please contact the
                super administrator.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default withAuth(ProfilePage);

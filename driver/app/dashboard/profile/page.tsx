"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  User,
  Phone,
  Mail,
  Calendar,
  Clock,
  LogOut,
  Star,
  Eye,
  EyeOff,
  Edit,
  Save,
  X,
  Building,
  MapPin,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

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

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<DriverProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [changing, setChanging] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const data = await api.get("/driver/profile");
        setProfileData(data.driver);
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
      const updatedData = await api.put("/driver/profile", {
        name: profileData.name,
        phoneNumber: profileData.phoneNumber,
      });

      setProfileData(updatedData.driver);
      setIsEditing(false);
      toast.success("Profile updated successfully");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile. Please try again.");
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
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
      await api.put("/driver/change-password", { oldPassword, newPassword });
      toast.success("Password changed successfully");
      setShowChangePassword(false);
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast.error(error.message || "Failed to change password");
    } finally {
      setChanging(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("driverToken");
    localStorage.removeItem("driverName");
    toast.success("Logged out successfully");
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Driver Profile</h1>

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
              <Skeleton className="h-20 w-20 rounded-2xl" />
              <div className="space-y-2">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
            <div className="grid gap-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
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
    <div className="space-y-6">
      {/* Header */}
      <h1 className="text-3xl font-bold text-foreground">Driver Profile</h1>

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
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground/70">
                Full Name
              </Label>
              <div className="flex items-center gap-3 p-3 bg-background rounded-lg border border-border hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
                <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                {isEditing ? (
                  <Input
                    value={profileData.name}
                    onChange={(e) =>
                      setProfileData({
                        ...profileData,
                        name: e.target.value,
                      })
                    }
                    className="flex-1"
                    placeholder="Enter your full name"
                  />
                ) : (
                  <span className="font-medium text-foreground">
                    {profileData.name}
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground/70">
                Phone Number
              </Label>
              <div className="flex items-center gap-3 p-3 bg-background rounded-lg border border-border hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
                <Phone className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                {isEditing ? (
                  <Input
                    value={profileData.phoneNumber}
                    onChange={(e) =>
                      setProfileData({
                        ...profileData,
                        phoneNumber: e.target.value,
                      })
                    }
                    className="flex-1"
                    placeholder="Enter your phone number"
                  />
                ) : (
                  <span className="font-medium text-foreground">
                    {profileData.phoneNumber}
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground/70">
                Email Address
              </Label>
              <div className="flex items-center gap-3 p-3 bg-background rounded-lg border border-border hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
                <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <span className="font-medium text-foreground">
                  {profileData.email}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground/70">
                Member Since
              </Label>
              <div className="flex items-center gap-3 p-3 bg-background rounded-lg border border-border hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
                <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <span className="font-medium text-foreground">
                  {new Date(profileData.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
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
        </CardContent>
      </Card>

      {/* Hotel Information */}
      {profileData.hotel && (
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Building className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              Hotel Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-4">
              <Building className="h-6 w-6 text-blue-600 mt-1" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-foreground">
                  {profileData.hotel.name}
                </h3>
                {profileData.hotel.address && (
                  <div className="flex items-center gap-2 mt-1">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <p className="text-foreground/70">
                      {profileData.hotel.address}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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

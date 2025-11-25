"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import type { InputHTMLAttributes } from "react";
import { useAction, useQuery } from "convex/react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Loader2, Camera, Pencil } from "lucide-react";
import PageLayout from "@/components/layout/page-layout";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useFileUpload } from "@/hooks/use-file-upload";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Skeleton } from "@/components/ui/skeleton";

type UserProfileData = {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
  role: string;
  profilePictureId: Id<"files"> | null;
  notificationCount: number;
  chatCount: number;
  hasPassword: boolean;
};

const profileFormSchema = z.object({
  name: z.string().min(2, "Enter your full name").max(120, "Name is too long"),
  email: z.string().email("Enter a valid email"),
  phoneNumber: z
    .string()
    .min(5, "Enter a valid phone number")
    .max(25, "Phone number is too long"),
});

const passwordFormSchema = z
  .object({
    currentPassword: z
      .string()
      .min(6, "Current password must be at least 6 characters"),
    newPassword: z
      .string()
      .min(6, "New password must be at least 6 characters"),
    confirmPassword: z
      .string()
      .min(6, "Confirm password must be at least 6 characters"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ProfileFormValues = z.infer<typeof profileFormSchema>;
type PasswordFormValues = z.infer<typeof passwordFormSchema>;

type PersonalInfoField = {
  name: keyof ProfileFormValues;
  label: string;
  placeholder: string;
  type: string;
  autoComplete: string;
  inputMode?: InputHTMLAttributes<HTMLInputElement>["inputMode"];
};

const personalInfoFields: PersonalInfoField[] = [
  {
    name: "name",
    label: "Full name",
    placeholder: "Jordan Carter",
    type: "text",
    autoComplete: "name",
  },
  {
    name: "email",
    label: "Email",
    placeholder: "you@example.com",
    type: "email",
    autoComplete: "email",
    inputMode: "email",
  },
  {
    name: "phoneNumber",
    label: "Phone number",
    placeholder: "+1 (555) 123-4567",
    type: "tel",
    autoComplete: "tel",
    inputMode: "tel",
  },
];

type SecurityField = {
  name: keyof PasswordFormValues;
  label: string;
  autoComplete: string;
};

const securityFields: SecurityField[] = [
  {
    name: "currentPassword",
    label: "Current password",
    autoComplete: "current-password",
  },
  { name: "newPassword", label: "New password", autoComplete: "new-password" },
  {
    name: "confirmPassword",
    label: "Confirm new password",
    autoComplete: "new-password",
  },
];

export default function ProfilePage() {
  const { user, status } = useAuthSession();
  const profileArgs = user?.id
    ? ({ userId: user.id as Id<"users"> } as const)
    : "skip";
  const profile = useQuery(api.users.index.getUserProfile, profileArgs) as
    | UserProfileData
    | undefined
    | null;
  const organization = useQuery(api.hotels.index.getHotelByUserId, profileArgs);
  const updateProfile = useAction(api.users.index.updateUserProfile);

  const profilePictureUrl = useQuery(
    api.files.index.getProfilePictureUrl,
    profile?.profilePictureId
      ? ({ fileId: profile.profilePictureId } as const)
      : "skip"
  );

  const [profileSubmitting, setProfileSubmitting] = useState(false);
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phoneNumber: "",
    },
  });

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    if (profile) {
      profileForm.reset({
        name: profile.name,
        email: profile.email,
        phoneNumber: profile.phoneNumber,
      });
    }
  }, [profile, profileForm]);

  const initials = useMemo(() => {
    const source = profile?.name || user?.name || "";
    if (!source.trim()) return "US";
    return source
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }, [profile?.name, user?.name]);

  const [isProfileEditMode, setIsProfileEditMode] = useState(false);

  const handleProfileSubmit = profileForm.handleSubmit(async (values) => {
    if (!user?.id) {
      toast.error("You must be signed in to update your profile.");
      return;
    }
    setProfileSubmitting(true);
    try {
      const updated = await updateProfile({
        userId: user.id as Id<"users">,
        name: values.name.trim(),
        email: values.email.trim().toLowerCase(),
        phoneNumber: values.phoneNumber.trim(),
      });
      profileForm.reset({
        name: updated.name,
        email: updated.email,
        phoneNumber: updated.phoneNumber,
      });
      setIsProfileEditMode(false);
      toast.success("Profile updated");
    } catch (error: any) {
      toast.error(error?.message ?? "Failed to update profile");
    } finally {
      setProfileSubmitting(false);
    }
  });

  const [isPasswordEditMode, setIsPasswordEditMode] = useState(false);

  const handlePasswordSubmit = passwordForm.handleSubmit(async (values) => {
    if (!user?.id) {
      toast.error("You must be signed in to update your password.");
      return;
    }
    setPasswordSubmitting(true);
    try {
      await updateProfile({
        userId: user.id as Id<"users">,
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      passwordForm.reset({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setIsPasswordEditMode(false);
      toast.success("Password reset successfully");
    } catch (error: any) {
      const message =
        error?.message ??
        (error instanceof Error ? error.message : "Failed to update password");
      if (typeof message === "string") {
        if (message.toLowerCase().includes("current password is incorrect")) {
          toast.error("Current password is incorrect");
        } else if (
          message
            .toLowerCase()
            .includes("current password is required to set a new password")
        ) {
          toast.error("Enter your current password to update it");
        } else {
          toast.error(message);
        }
      } else {
        toast.error("Failed to update password");
      }
    } finally {
      setPasswordSubmitting(false);
    }
  });

  const isLoadingSession = status === "loading";
  const isProfileLoading = !!user && profile === undefined;

  if (isLoadingSession || isProfileLoading) {
    return (
      <PageLayout title="Profile" description="Loading your profile details.">
        <ProfileLoadingState />
      </PageLayout>
    );
  }

  if (!user || !profile) {
    return (
      <PageLayout title="Profile" description="Manage your account details">
        <SignedOutNotice />
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Profile"
      description="Manage your identity, security, and hotel workspace context."
      size="large"
    >
      <div className="space-y-6 pb-16">
        <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
          <ProfileHero
            profile={profile}
            initials={initials}
            userImage={user.image}
            profilePictureUrl={profilePictureUrl ?? undefined}
            userId={user.id as Id<"users">}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
          <PersonalInfoCard
            form={profileForm}
            onSubmit={handleProfileSubmit}
            isSubmitting={profileSubmitting}
            isEditMode={isProfileEditMode}
            onEditModeChange={setIsProfileEditMode}
            profile={profile}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
          <SecurityCard
            form={passwordForm}
            onSubmit={handlePasswordSubmit}
            isSubmitting={passwordSubmitting}
            isEditMode={isPasswordEditMode}
            onEditModeChange={setIsPasswordEditMode}
          />
        </div>
      </div>
    </PageLayout>
  );
}

function ProfileHero({
  profile,
  initials,
  userImage,
  profilePictureUrl,
  userId,
}: {
  profile: UserProfileData;
  initials: string;
  userImage: string | null | undefined;
  profilePictureUrl?: string | null;
  userId: Id<"users">;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { uploadFile, isUploading } = useFileUpload("profile", {
    onSuccess: () => {
      toast.success("Profile picture updated successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to upload profile picture");
    },
  });

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image size must be less than 10MB");
      return;
    }

    await uploadFile(file, { userId });

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const handleUploadClick = () => {
    inputRef.current?.click();
  };

  const displayImage = profilePictureUrl || userImage;

  return (
    <Card className="shadow-sm">
      <CardContent className="flex flex-col gap-6 pt-6 lg:flex-row lg:items-center">
        <div className="flex items-center gap-4">
          <div className="relative group">
            <Avatar className="h-20 w-20 rounded-2xl border">
              <AvatarImage src={displayImage ?? undefined} alt={profile.name} />
              <AvatarFallback className="rounded-2xl text-lg font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              disabled={isUploading}
            />
            <Button
              type="button"
              size="icon"
              variant="secondary"
              className="absolute bottom-0 right-0 h-8 w-8 rounded-full shadow-md"
              onClick={handleUploadClick}
              disabled={isUploading}
            >
              {isUploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Camera className="h-4 w-4" />
              )}
            </Button>
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-semibold">{profile.name}</h2>
              <Badge variant="secondary" className="capitalize">
                {profile.role}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Stay current with your workspace identity, credentials, and hotel
              context from a single place.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PersonalInfoCard({
  form,
  onSubmit,
  isSubmitting,
  isEditMode,
  onEditModeChange,
  profile,
}: {
  form: ReturnType<typeof useForm<ProfileFormValues>>;
  onSubmit: () => void;
  isSubmitting: boolean;
  isEditMode: boolean;
  onEditModeChange: (value: boolean) => void;
  profile: UserProfileData;
}) {
  const handleEditClick = () => {
    onEditModeChange(true);
  };

  const handleCancel = () => {
    form.reset({
      name: profile.name,
      email: profile.email,
      phoneNumber: profile.phoneNumber,
    });
    onEditModeChange(false);
  };

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>Personal information</CardTitle>
            <CardDescription>
              Keep your contact details accurate so teams know how to reach you.
            </CardDescription>
          </div>
          {!isEditMode && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleEditClick}
            >
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form className="space-y-5" onSubmit={onSubmit}>
            {personalInfoFields.map((fieldConfig) => (
              <FormField
                key={fieldConfig.name}
                control={form.control}
                name={fieldConfig.name}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{fieldConfig.label}</FormLabel>
                    <FormControl>
                      <Input
                        type={fieldConfig.type}
                        autoComplete={fieldConfig.autoComplete}
                        inputMode={fieldConfig.inputMode}
                        placeholder={fieldConfig.placeholder}
                        readOnly={!isEditMode}
                        className={
                          !isEditMode
                            ? "cursor-default bg-muted/50 text-foreground"
                            : ""
                        }
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
            {isEditMode && (
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  )}
                  Save changes
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={isSubmitting}
                  onClick={handleCancel}
                >
                  Cancel
                </Button>
              </div>
            )}
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

function SecurityCard({
  form,
  onSubmit,
  isSubmitting,
  isEditMode,
  onEditModeChange,
}: {
  form: ReturnType<typeof useForm<PasswordFormValues>>;
  onSubmit: () => void;
  isSubmitting: boolean;
  isEditMode: boolean;
  onEditModeChange: (value: boolean) => void;
}) {
  const handleEditClick = () => {
    onEditModeChange(true);
  };

  const handleCancel = () => {
    form.reset({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
    onEditModeChange(false);
  };

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>Security</CardTitle>
            <CardDescription>
              Update your password to keep access restricted to you.
            </CardDescription>
          </div>
          {!isEditMode && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleEditClick}
            >
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form className="space-y-5" onSubmit={onSubmit}>
            {securityFields.map((fieldConfig) => (
              <FormField
                key={fieldConfig.name}
                control={form.control}
                name={fieldConfig.name}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{fieldConfig.label}</FormLabel>
                    <FormControl>
                      <PasswordInput
                        autoComplete={fieldConfig.autoComplete}
                        readOnly={!isEditMode}
                        className={
                          !isEditMode
                            ? "cursor-default bg-muted/50 text-foreground"
                            : ""
                        }
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
            {isEditMode && (
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  )}
                  Update password
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={isSubmitting}
                  onClick={handleCancel}
                >
                  Cancel
                </Button>
                <p className="text-xs text-muted-foreground">
                  Passwords must be at least 6 characters.
                </p>
              </div>
            )}
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

function ProfileLoadingState() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-44 w-full" />
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

function SignedOutNotice() {
  return (
    <Card className="mx-auto max-w-xl border-dashed">
      <CardHeader>
        <CardTitle>You are not signed in</CardTitle>
        <CardDescription>
          Sign in to access and edit your profile.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { useAction } from "convex/react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import timezones from "timezones-list";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAuthSession } from "@/hooks/use-auth-session";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

 const formSchema = z.object({
  name: z.string().min(1, "Hotel name is required").max(150),
  slug: z
    .string()
    .min(1, "Slug is required")
    .max(160)
    .regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers, and hyphens only"),
  address: z.string().min(1, "Address is required"),
  phoneNumber: z.string().min(5, "Phone number is required"),
  email: z.string().email("Enter a valid email"),
  timeZone: z.string().min(1, "Time zone is required"),
  latitude: z
    .number()
    .min(-90, "Latitude must be greater than -90")
    .max(90, "Latitude must be less than 90"),
  longitude: z
    .number()
    .min(-180, "Longitude must be greater than -180")
    .max(180, "Longitude must be less than 180"),
});

type FormValues = z.infer<typeof formSchema>;

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export function CreateHotelForm() {
  const { user } = useAuthSession();
  const router = useRouter();
  const createHotel = useAction(api.hotels.createHotel);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      slug: "",
      address: "",
      phoneNumber: "",
      email: "",
      timeZone: "",
      latitude: 0,
      longitude: 0,
    },
  });

  const timezoneOptions = useMemo(
    () =>
      timezones.map((tz) => ({
        value: tz.tzCode,
        label: `${tz.tzCode} (${tz.label})`,
      })),
    []
  );

  const watchedName = form.watch("name");

  useEffect(() => {
    if (!slugManuallyEdited) {
      form.setValue("slug", slugify(watchedName || ""));
    }
  }, [watchedName, slugManuallyEdited, form]);

  const handleSubmit = form.handleSubmit(async (values) => {
    if (!user?.id) {
      setRequestError("You must be signed in to create a hotel.");
      return;
    }
    setRequestError(null);
    try {
      await createHotel({
        adminId: user.id as Id<"users">,
        name: values.name,
        slug: values.slug,
        address: values.address,
        phoneNumber: values.phoneNumber,
        email: values.email,
        timeZone: values.timeZone,
        latitude: values.latitude,
        longitude: values.longitude,
      });
      form.reset();
      setSlugManuallyEdited(false);
      router.refresh();
    } catch (error: any) {
      setRequestError(error.message ?? "Failed to create hotel");
    }
  });

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 rounded-xl border bg-card p-8 shadow-sm">
      <div className="space-y-2">
        <h2 className="text-3xl font-semibold tracking-tight">
          Create Your Hotel
        </h2>
        <p className="text-sm text-muted-foreground">
          Start by adding your hotel&apos;s basic information. You can update these details later.
        </p>
      </div>
      <Form {...form}>
        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-xl border bg-background/60 p-6 shadow-sm"
        >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-medium">
                    Hotel Name <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Sunrise Suites"
                      autoComplete="organization"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-medium">
                    Slug <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="sunrise-suites"
                      {...field}
                      onChange={(event) => {
                        setSlugManuallyEdited(true);
                        field.onChange(event.target.value);
                      }}
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    This will be used in URLs like{" "}
                    <span className="font-medium text-foreground">
                      /hotels/sunrise-suites
                    </span>
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-medium">
                    Address <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="123 Ocean Avenue"
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-medium">
                      Phone Number
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="tel"
                        placeholder="+1 555 000 0000"
                        className="pl-10"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-medium">
                      Email
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="info@hotel.com"
                        className="pl-10"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          <FormField
            control={form.control}
            name="timeZone"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base font-medium">
                  Time Zone
                </FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="text-left">
                      <SelectValue placeholder="Select a time zone" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="max-h-64">
                    {timezoneOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="latitude"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-medium">
                      Latitude
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.000001"
                        placeholder="40.7128"
                        value={Number.isNaN(field.value) ? "" : field.value}
                        onChange={(event) => {
                          const nextValue =
                            event.target.value === ""
                              ? Number.NaN
                              : event.target.valueAsNumber;
                          field.onChange(nextValue);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="longitude"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-medium">
                      Longitude
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.000001"
                        placeholder="-74.0060"
                        value={Number.isNaN(field.value) ? "" : field.value}
                        onChange={(event) => {
                          const nextValue =
                            event.target.value === ""
                              ? Number.NaN
                              : event.target.valueAsNumber;
                          field.onChange(nextValue);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          {requestError ? (
            <div className="rounded-md border border-destructive bg-destructive/10 px-4 py-2 text-sm text-destructive">
              {requestError}
            </div>
          ) : null}
          <Button
            type="submit"
            size="lg"
            className="w-full md:w-auto"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Hotel"
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
}

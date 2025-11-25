"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction, useQuery } from "convex/react";
import { Loader2, Plus, Trash2, AlertCircle } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";

import { api } from "@/convex/_generated/api";
import { useAuthSession } from "@/hooks/use-auth-session";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const tripSlotSchema = z.object({
  startTime: z
    .string()
    .min(1, "Start time is required")
    .regex(/^([0-1][0-9]|2[0-3]):00$/, "Time must be in hour-only format (HH:00)"),
  endTime: z
    .string()
    .min(1, "End time is required")
    .regex(/^([0-1][0-9]|2[0-3]):00$/, "Time must be in hour-only format (HH:00)"),
});

const formSchema = z
  .object({
    name: z.string().min(1, "Trip name is required").max(200),
    sourceLocationId: z.string().min(1, "Source location is required"),
    destinationLocationId: z.string().min(1, "Destination location is required"),
    charges: z
      .number()
      .positive("Charges must be a positive number")
      .min(0.01, "Charges must be at least $0.01"),
    tripSlots: z
      .array(tripSlotSchema)
      .min(1, "At least one trip slot is required"),
  })
  .refine((data) => data.sourceLocationId !== data.destinationLocationId, {
    message: "Source and destination must be different",
    path: ["destinationLocationId"],
  })
  .refine(
    (data) => {
      return data.tripSlots.every((slot) => {
        const [startHours] = slot.startTime.split(":").map(Number);
        const [endHours] = slot.endTime.split(":").map(Number);
        return startHours < endHours;
      });
    },
    {
      message: "Start time must be before end time",
      path: ["tripSlots"],
    }
  )
  .refine(
    (data) => {
      return data.tripSlots.every((slot) => {
        const [startHours] = slot.startTime.split(":").map(Number);
        const [endHours] = slot.endTime.split(":").map(Number);
        const duration = endHours - startHours;
        return duration >= 1;
      });
    },
    {
      message: "Minimum duration must be at least 1 hour",
      path: ["tripSlots"],
    }
  );

type FormValues = z.infer<typeof formSchema>;

type EditAdminTripFormProps = {
  tripId: Id<"trips">;
};

export function EditAdminTripForm({ tripId }: EditAdminTripFormProps) {
  const router = useRouter();
  const { user } = useAuthSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const trip = useQuery(api.trips.getTripById, { tripId });
  const updateTrip = useAction(api.trips.updateTrip);

  const locations = useQuery(
    api.locations.listAdminLocations,
    user?.id
      ? {
          adminId: user.id as Id<"users">,
          limit: 100,
        }
      : "skip"
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      sourceLocationId: "",
      destinationLocationId: "",
      charges: 0,
      tripSlots: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "tripSlots",
  });

  const slotErrorRegexes = [
    /(Trip slot .+? already exists for this route\.)/,
    /(Duplicate trip slot .+? is not allowed)/,
  ];

  const parseSlotError = (message: string | null) => {
    if (!message) {
      return null;
    }
    for (const regex of slotErrorRegexes) {
      const match = message.match(regex);
      if (match) {
        return match[1];
      }
    }
    return null;
  };

  const conflictMessage = useMemo(
    () => parseSlotError(requestError),
    [requestError]
  );

  const formatErrorMessage = (error: unknown) => {
    const raw =
      typeof error === "object" && error !== null && "message" in error
        ? String((error as any).message ?? "")
        : String(error ?? "");

    const slotError = parseSlotError(raw);
    if (slotError) {
      return slotError;
    }

    const cleaned = raw
      .split("\n")[0]
      .replace(/\[CONVEX.*?\]\s*/g, "")
      .replace(/\[Request ID:[^\]]*\]\s*/gi, "")
      .trim();

    if (!cleaned || cleaned.toLowerCase() === "server error") {
      return "Something went wrong. Please try again.";
    }

    return cleaned;
  };

  useEffect(() => {
    if (trip && locations && !isInitialized) {
      form.reset({
        name: trip.name,
        sourceLocationId: trip.sourceLocationId as string,
        destinationLocationId: trip.destinationLocationId as string,
        charges: trip.charges,
        tripSlots: trip.tripSlots.map((slot) => ({
          startTime: slot.startTimeDisplay,
          endTime: slot.endTimeDisplay,
        })),
      });
      setIsInitialized(true);
    }
  }, [trip, locations, form, isInitialized]);

  const handleSubmit = async (values: FormValues) => {
    if (!user?.id) {
      setRequestError("You must be signed in to update a trip.");
      return;
    }

    try {
      setIsSubmitting(true);
      setRequestError(null);

      await updateTrip({
        currentUserId: user.id as any,
        tripId,
        name: values.name.trim(),
        sourceLocationId: values.sourceLocationId as Id<"locations">,
        destinationLocationId: values.destinationLocationId as Id<"locations">,
        charges: values.charges,
        tripSlots: values.tripSlots.map((slot) => ({
          startTime: slot.startTime,
          endTime: slot.endTime,
        })),
      });

      router.push("/admin/trips");
    } catch (error) {
      setRequestError(formatErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const addSlot = () => {
    append({
      startTime: "07:00",
      endTime: "08:00",
    });
  };

  if (!trip || !locations || !isInitialized) {
    return (
      <div className="mx-auto mb-10 max-w-5xl space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto mb-10 max-w-5xl space-y-10">
      <Form {...form}>
        <form className="space-y-8" onSubmit={form.handleSubmit(handleSubmit)}>
          <section className="grid gap-6 md:grid-cols-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Trip Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Airport to Hotel" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="charges"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Charges (USD)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="25.00"
                      value={Number.isNaN(field.value) ? "" : field.value}
                      onChange={(event) =>
                        field.onChange(event.target.valueAsNumber || 0)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </section>

          <section className="grid gap-6 md:grid-cols-2">
            <FormField
              control={form.control}
              name="sourceLocationId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Source Location</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select source location" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {locations?.locations.map((location) => (
                        <SelectItem key={location.id} value={location.id}>
                          {location.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="destinationLocationId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Destination Location</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select destination location" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {locations?.locations.map((location) => (
                        <SelectItem key={location.id} value={location.id}>
                          {location.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Trip Slots</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addSlot}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Slot
              </Button>
            </div>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Start Time</TableHead>
                    <TableHead>End Time</TableHead>
                    <TableHead className="w-[100px]">Remove</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fields.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        No slots added. Click "Add Slot" to add one.
                      </TableCell>
                    </TableRow>
                  ) : (
                    fields.map((field, index) => (
                      <TableRow key={field.id}>
                        <TableCell>
                          <FormField
                            control={form.control}
                            name={`tripSlots.${index}.startTime`}
                            render={({ field }) => {
                              const currentHour = field.value
                                ? field.value.split(":")[0]
                                : "";
                              return (
                                <FormItem>
                                  <FormControl>
                                    <Select
                                      value={currentHour}
                                      onValueChange={(hour) => {
                                        field.onChange(`${hour}:00`);
                                      }}
                                    >
                                      <SelectTrigger className="w-full">
                                        <SelectValue placeholder="HH" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {Array.from({ length: 24 }, (_, i) => {
                                          const hour = String(i).padStart(2, "0");
                                          return (
                                            <SelectItem key={hour} value={hour}>
                                              {hour}:00
                                            </SelectItem>
                                          );
                                        })}
                                      </SelectContent>
                                    </Select>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              );
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <FormField
                            control={form.control}
                            name={`tripSlots.${index}.endTime`}
                            render={({ field }) => {
                              const currentHour = field.value
                                ? field.value.split(":")[0]
                                : "";
                              return (
                                <FormItem>
                                  <FormControl>
                                    <Select
                                      value={currentHour}
                                      onValueChange={(hour) => {
                                        field.onChange(`${hour}:00`);
                                      }}
                                    >
                                      <SelectTrigger className="w-full">
                                        <SelectValue placeholder="HH" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {Array.from({ length: 24 }, (_, i) => {
                                          const hour = String(i).padStart(2, "0");
                                          return (
                                            <SelectItem key={hour} value={hour}>
                                              {hour}:00
                                            </SelectItem>
                                          );
                                        })}
                                      </SelectContent>
                                    </Select>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              );
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => remove(index)}
                            disabled={fields.length === 1}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            {conflictMessage && (
              <Alert variant="destructive" role="alert">
                <AlertCircle className="h-4 w-4" />
                <div className="col-start-2 space-y-1">
                  <AlertTitle>Scheduling conflict</AlertTitle>
                  <AlertDescription>{conflictMessage}</AlertDescription>
                </div>
              </Alert>
            )}
          </section>

          {requestError && !conflictMessage && (
            <Alert variant="destructive" role="alert">
              <AlertCircle className="h-4 w-4" />
              <div className="col-start-2 space-y-2">
                <AlertTitle>Request Failed</AlertTitle>
                <AlertDescription>{requestError}</AlertDescription>
              </div>
            </Alert>
          )}

          <div className="flex flex-wrap items-center justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.push("/admin/trips")}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Trip"
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}


"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction, useQuery } from "convex/react";
import {
  Loader2,
  Plus,
  Trash2,
  AlertCircle,
  GripVertical,
  ArrowDown,
} from "lucide-react";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const tripSlotSchema = z.object({
  startTime: z
    .string()
    .min(1, "Start time is required")
    .regex(
      /^([0-1][0-9]|2[0-3]):00$/,
      "Time must be in hour-only format (HH:00)"
    ),
  endTime: z
    .string()
    .min(1, "End time is required")
    .regex(
      /^([0-1][0-9]|2[0-3]):00$/,
      "Time must be in hour-only format (HH:00)"
    ),
});

const stopSchema = z.object({
  locationId: z.string().min(1, "Location is required"),
  charges: z.number().min(0, "Charges must be 0 or more"),
});

const formSchema = z
  .object({
    name: z.string().min(1, "Trip name is required").max(200),
    stops: z.array(stopSchema).min(2, "At least 2 stops are required"),
    tripSlots: z
      .array(tripSlotSchema)
      .min(1, "At least one trip slot is required"),
  })
  .refine(
    (data) => {
      const locationIds = data.stops.map((s) => s.locationId);
      const uniqueIds = new Set(locationIds);
      return uniqueIds.size === locationIds.length;
    },
    {
      message: "All stops must be different locations",
      path: ["stops"],
    }
  )
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

export function AddAdminTripForm() {
  const router = useRouter();
  const { user } = useAuthSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  const createTrip = useAction(api.trips.index.createTrip);

  const locations = useQuery(
    api.locations.index.listAdminLocations,
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
      stops: [
        { locationId: "", charges: 0 },
        { locationId: "", charges: 0 },
      ],
      tripSlots: [
        {
          startTime: "07:00",
          endTime: "08:00",
        },
      ],
    },
  });

  const {
    fields: stopFields,
    append: appendStop,
    remove: removeStop,
    move: moveStop,
  } = useFieldArray({
    control: form.control,
    name: "stops",
  });

  const {
    fields: slotFields,
    append: appendSlot,
    remove: removeSlot,
  } = useFieldArray({
    control: form.control,
    name: "tripSlots",
  });

  const formatErrorMessage = (error: unknown) => {
    const raw =
      typeof error === "object" && error !== null && "message" in error
        ? String((error as any).message ?? "")
        : String(error ?? "");

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

  const handleSubmit = async (values: FormValues) => {
    if (!user?.id) {
      setRequestError("You must be signed in to create a trip.");
      return;
    }

    try {
      setIsSubmitting(true);
      setRequestError(null);

      await createTrip({
        currentUserId: user.id as Id<"users">,
        name: values.name.trim(),
        stops: values.stops.map((stop) => ({
          locationId: stop.locationId as Id<"locations">,
          charges: stop.charges,
        })),
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

  const addStop = () => {
    appendStop({ locationId: "", charges: 0 });
  };

  const addSlot = () => {
    appendSlot({
      startTime: "07:00",
      endTime: "08:00",
    });
  };

  const totalCharges = useMemo(() => {
    const stops = form.watch("stops");
    return stops.slice(0, -1).reduce((sum, stop) => sum + (stop.charges || 0), 0);
  }, [form.watch("stops")]);

  return (
    <div className="mx-auto mb-10 max-w-5xl space-y-10">
      <Form {...form}>
        <form className="space-y-8" onSubmit={form.handleSubmit(handleSubmit)}>
          <section className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Trip Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Airport → Hotel → Convention Center" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </section>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Route Stops</CardTitle>
                <Button type="button" variant="outline" size="sm" onClick={addStop}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Stop
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Define the stops for this trip. Each segment between stops will have its own charge.
                The last stop&apos;s charge is not used (it&apos;s the destination).
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {stopFields.map((field, index) => (
                <div key={field.id} className="relative">
                  <div className="flex items-start gap-3">
                    <div className="flex flex-col items-center pt-8">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                        {index + 1}
                      </div>
                      {index < stopFields.length - 1 && (
                        <div className="flex flex-col items-center py-2">
                          <ArrowDown className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 grid gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name={`stops.${index}.locationId`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              {index === 0 ? "Start Location" : index === stopFields.length - 1 ? "Final Destination" : `Stop ${index + 1}`}
                            </FormLabel>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select location" />
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

                      {index < stopFields.length - 1 && (
                        <FormField
                          control={form.control}
                          name={`stops.${index}.charges`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Charge to next stop (USD)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
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
                      )}

                      {index === stopFields.length - 1 && (
                        <div className="flex items-end">
                          <p className="text-sm text-muted-foreground pb-2">
                            Final destination (no charge)
                          </p>
                        </div>
                      )}
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="mt-8 text-destructive hover:text-destructive"
                      onClick={() => removeStop(index)}
                      disabled={stopFields.length <= 2}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}

              {totalCharges > 0 && (
                <div className="rounded-lg bg-muted/50 p-3 text-sm">
                  Total trip charge (all segments): <span className="font-semibold">${totalCharges.toFixed(2)}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Trip Slots</h3>
              <Button type="button" variant="outline" size="sm" onClick={addSlot}>
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
                  {slotFields.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        No slots added. Click &quot;Add Slot&quot; to add one.
                      </TableCell>
                    </TableRow>
                  ) : (
                    slotFields.map((field, index) => (
                      <TableRow key={field.id}>
                        <TableCell>
                          <FormField
                            control={form.control}
                            name={`tripSlots.${index}.startTime`}
                            render={({ field }) => {
                              const currentHour = field.value ? field.value.split(":")[0] : "";
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
                              const currentHour = field.value ? field.value.split(":")[0] : "";
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
                            onClick={() => removeSlot(index)}
                            disabled={slotFields.length === 1}
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
          </section>

          {requestError && (
            <Alert variant="destructive" role="alert">
              <AlertCircle className="h-4 w-4" />
              <div className="col-start-2 space-y-2">
                <AlertTitle>Request Failed</AlertTitle>
                <AlertDescription>{requestError}</AlertDescription>
              </div>
            </Alert>
          )}

          <div className="flex flex-wrap items-center justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => router.push("/admin/trips")}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Trip"
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

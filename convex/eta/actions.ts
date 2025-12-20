"use node";

import { action, internalAction } from "../_generated/server";
import { v, ConvexError } from "convex/values";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";

const GOOGLE_ROUTES_API_URL =
  "https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix";

interface RouteMatrixResponse {
  originIndex: number;
  destinationIndex: number;
  status: Record<string, unknown>;
  distanceMeters?: number;
  duration?: string;
  condition?: string;
}

interface DestinationInfo {
  routeInstanceId: Id<"routeInstances">;
  lat: number;
  lng: number;
  orderIndex: number;
}

function parseDuration(duration: string | undefined): number {
  if (!duration) return 0;
  const seconds = parseInt(duration.replace("s", ""), 10);
  return isNaN(seconds) ? 0 : seconds;
}

function formatETA(seconds: number): string {
  if (seconds <= 0) return "Arriving";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  if (remainingMins === 0) return `${hours}h`;
  return `${hours}h ${remainingMins}m`;
}

async function fetchETAsFromGoogle(
  driverLat: number,
  driverLng: number,
  destinations: Array<{ lat: number; lng: number }>,
  apiKey: string
): Promise<RouteMatrixResponse[]> {
  if (destinations.length === 0) {
    return [];
  }

  const response = await fetch(GOOGLE_ROUTES_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask":
        "originIndex,destinationIndex,duration,distanceMeters,status,condition",
    },
    body: JSON.stringify({
      origins: [
        {
          waypoint: {
            location: {
              latLng: {
                latitude: driverLat,
                longitude: driverLng,
              },
            },
          },
        },
      ],
      destinations: destinations.map((d) => ({
        waypoint: {
          location: {
            latLng: {
              latitude: d.lat,
              longitude: d.lng,
            },
          },
        },
      })),
      travelMode: "DRIVE",
      routingPreference: "TRAFFIC_AWARE",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Google Routes API error: ${response.status} - ${errorText}`
    );
  }

  const data = await response.json();
  return data as RouteMatrixResponse[];
}

export const calculateAndUpdateETAs = action({
  args: {
    tripInstanceId: v.id("tripInstances"),
    driverLatitude: v.number(),
    driverLongitude: v.number(),
  },
  async handler(ctx, args) {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.warn("Google Maps API key not configured - skipping ETA update");
      return {
        success: false,
        message: "Google Maps API key not configured",
        updatedCount: 0,
      };
    }

    const incompleteRoutes = await ctx.runQuery(
      internal.eta.queries.getIncompleteRouteInstancesWithLocations,
      { tripInstanceId: args.tripInstanceId }
    );

    if (incompleteRoutes.length === 0) {
      return { success: true, message: "No incomplete routes to update" };
    }

    const destinations: DestinationInfo[] = incompleteRoutes
      .filter((r) => r.endLocation !== null)
      .map((r) => ({
        routeInstanceId: r._id,
        lat: r.endLocation!.latitude,
        lng: r.endLocation!.longitude,
        orderIndex: r.orderIndex,
      }));

    if (destinations.length === 0) {
      return { success: true, message: "No valid destinations found" };
    }

    try {
      const results = await fetchETAsFromGoogle(
        args.driverLatitude,
        args.driverLongitude,
        destinations.map((d) => ({ lat: d.lat, lng: d.lng })),
        apiKey
      );

      const updates: Array<{
        routeInstanceId: Id<"routeInstances">;
        eta: string;
      }> = [];

      let cumulativeSeconds = 0;
      const sortedDestinations = [...destinations].sort(
        (a, b) => a.orderIndex - b.orderIndex
      );

      for (let i = 0; i < sortedDestinations.length; i++) {
        const dest = sortedDestinations[i];
        const result = results.find((r) => r.destinationIndex === i);

        if (result && result.condition === "ROUTE_EXISTS") {
          const durationSeconds = parseDuration(result.duration);
          if (i === 0) {
            cumulativeSeconds = durationSeconds;
          } else {
            cumulativeSeconds += durationSeconds;
          }

          updates.push({
            routeInstanceId: dest.routeInstanceId,
            eta: formatETA(cumulativeSeconds),
          });
        }
      }

      if (updates.length > 0) {
        await ctx.runMutation(
          internal.routeInstances.mutations.updateMultipleRouteInstanceETAs,
          { updates }
        );
      }

      return {
        success: true,
        message: `Updated ETAs for ${updates.length} route segments`,
        updatedCount: updates.length,
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("Failed to fetch ETAs from Google:", errorMessage);
      throw new ConvexError(`Failed to calculate ETAs: ${errorMessage}`);
    }
  },
});

export const calculateAndUpdateETAsInternal = internalAction({
  args: {
    tripInstanceId: v.id("tripInstances"),
    driverLatitude: v.number(),
    driverLongitude: v.number(),
  },
  async handler(ctx, args) {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.error("Google Maps API key not configured");
      return { success: false, message: "API key not configured" };
    }

    const incompleteRoutes = await ctx.runQuery(
      internal.eta.queries.getIncompleteRouteInstancesWithLocations,
      { tripInstanceId: args.tripInstanceId }
    );

    if (incompleteRoutes.length === 0) {
      return { success: true, message: "No incomplete routes to update" };
    }

    const destinations: DestinationInfo[] = incompleteRoutes
      .filter((r) => r.endLocation !== null)
      .map((r) => ({
        routeInstanceId: r._id,
        lat: r.endLocation!.latitude,
        lng: r.endLocation!.longitude,
        orderIndex: r.orderIndex,
      }));

    if (destinations.length === 0) {
      return { success: true, message: "No valid destinations found" };
    }

    try {
      const results = await fetchETAsFromGoogle(
        args.driverLatitude,
        args.driverLongitude,
        destinations.map((d) => ({ lat: d.lat, lng: d.lng })),
        apiKey
      );

      const updates: Array<{
        routeInstanceId: Id<"routeInstances">;
        eta: string;
      }> = [];

      let cumulativeSeconds = 0;
      const sortedDestinations = [...destinations].sort(
        (a, b) => a.orderIndex - b.orderIndex
      );

      for (let i = 0; i < sortedDestinations.length; i++) {
        const dest = sortedDestinations[i];
        const result = results.find((r) => r.destinationIndex === i);

        if (result && result.condition === "ROUTE_EXISTS") {
          const durationSeconds = parseDuration(result.duration);
          if (i === 0) {
            cumulativeSeconds = durationSeconds;
          } else {
            cumulativeSeconds += durationSeconds;
          }

          updates.push({
            routeInstanceId: dest.routeInstanceId,
            eta: formatETA(cumulativeSeconds),
          });
        }
      }

      if (updates.length > 0) {
        await ctx.runMutation(
          internal.routeInstances.mutations.updateMultipleRouteInstanceETAs,
          { updates }
        );
      }

      return {
        success: true,
        message: `Updated ETAs for ${updates.length} route segments`,
        updatedCount: updates.length,
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("Failed to fetch ETAs from Google:", errorMessage);
      return { success: false, message: errorMessage };
    }
  },
});

"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

interface ETASegment {
  _id: Id<"routeInstances">;
  orderIndex: number;
  startLocationName: string;
  endLocationName: string;
  eta: string | undefined;
  completed: boolean;
}

interface UseTripETAResult {
  tripInstanceId: Id<"tripInstances"> | null;
  status: string | null;
  segments: ETASegment[];
  isLoading: boolean;
  nextETA: string | null;
}

export function useTripETA(
  tripInstanceId: Id<"tripInstances"> | null
): UseTripETAResult {
  const etaData = useQuery(
    api.eta.queries.getTripInstanceETAs,
    tripInstanceId ? { tripInstanceId } : "skip"
  );

  const isLoading = tripInstanceId !== null && etaData === undefined;

  if (!etaData) {
    return {
      tripInstanceId: null,
      status: null,
      segments: [],
      isLoading,
      nextETA: null,
    };
  }

  const incompleteSegments = etaData.segments.filter((s) => !s.completed);
  const nextETA = incompleteSegments.length > 0 ? incompleteSegments[0].eta ?? null : null;

  return {
    tripInstanceId: etaData.tripInstanceId,
    status: etaData.status,
    segments: etaData.segments,
    isLoading,
    nextETA,
  };
}

interface UseBookingETAResult {
  pickupLocationName: string | null;
  eta: string | null;
  isCompleted: boolean;
  isLoading: boolean;
}

export function useBookingETA(
  bookingId: Id<"bookings"> | null
): UseBookingETAResult {
  const etaData = useQuery(
    api.eta.queries.getBookingETA,
    bookingId ? { bookingId } : "skip"
  );

  const isLoading = bookingId !== null && etaData === undefined;

  if (!etaData) {
    return {
      pickupLocationName: null,
      eta: null,
      isCompleted: false,
      isLoading,
    };
  }

  return {
    pickupLocationName: etaData.pickupLocationName,
    eta: etaData.eta ?? null,
    isCompleted: etaData.isCompleted,
    isLoading,
  };
}


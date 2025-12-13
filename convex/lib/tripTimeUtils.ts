import { QueryCtx, MutationCtx } from "../_generated/server";
import { ConvexError } from "convex/values";
import type { Id } from "../_generated/dataModel";

export async function validateTripTime(
  ctx: QueryCtx | MutationCtx,
  tripId: Id<"trips">,
  startTime: string,
  endTime: string
): Promise<boolean> {
  const trip = await ctx.db.get(tripId);
  if (!trip) {
    throw new ConvexError("Trip not found");
  }

  for (const tripTimeId of trip.tripTimesIds) {
    const tripTime = await ctx.db.get(tripTimeId);
    if (!tripTime) {
      continue;
    }
    if (tripTime.startTime === startTime && tripTime.endTime === endTime) {
      return true;
    }
  }

  throw new ConvexError(
    `Invalid trip time slot: ${startTime} - ${endTime}. This time slot does not exist for the selected trip.`
  );
}

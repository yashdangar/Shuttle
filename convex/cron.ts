import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const cron = cronJobs();

cron.interval(
  "cleanupExpiredBookingChats",
  { hours: 6 },
  internal.chats.index.cleanupExpiredBookingChats
);

export default cron;

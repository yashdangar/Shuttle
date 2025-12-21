import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// Superadmin API wrapper with role-based access control
export class SuperadminAPI {
  static async verifySuperadmin(userId: string): Promise<boolean> {
    try {
      const user = await convex.query(api.auth.getUserById, { id: userId as Id<"users"> });
      return user?.role === "superadmin";
    } catch (error) {
      console.error("Error verifying superadmin:", error);
      return false;
    }
  }

  static async listHotels(userId: string, limit?: number) {
    const isAuthorized = await this.verifySuperadmin(userId);
    if (!isAuthorized) {
      throw new Error("Unauthorized: Superadmin access required");
    }

    return convex.query(api.hotels.index.listHotels, { limit });
  }

  static async getHotelById(userId: string, hotelId: string) {
    const isAuthorized = await this.verifySuperadmin(userId);
    if (!isAuthorized) {
      throw new Error("Unauthorized: Superadmin access required");
    }

    return convex.query(api.hotels.index.getHotelById, { hotelId: hotelId as Id<"hotels"> });
  }

  static async getHotelUsers(userId: string, hotelId: string) {
    const isAuthorized = await this.verifySuperadmin(userId);
    if (!isAuthorized) {
      throw new Error("Unauthorized: Superadmin access required");
    }

    const hotel = await convex.query(api.hotels.index.getHotelById, { hotelId: hotelId as Id<"hotels"> });
    if (!hotel) return [];

    // Get all users for this hotel
    const users = await Promise.all(
      hotel.userIds.map(async (userId) => {
        const user = await convex.query(api.auth.getUserById, { id: userId });
        return user;
      })
    );

    return users.filter(Boolean);
  }

  static async getHotelShuttles(userId: string, hotelId: string) {
    const isAuthorized = await this.verifySuperadmin(userId);
    if (!isAuthorized) {
      throw new Error("Unauthorized: Superadmin access required");
    }

    const hotel = await convex.query(api.hotels.index.getHotelById, { hotelId: hotelId as Id<"hotels"> });
    if (!hotel) return [];

    // Get all shuttles for this hotel
    const shuttles = await Promise.all(
      hotel.shuttleIds.map(async (shuttleId) => {
        const shuttle = await convex.query(api.shuttles.index.getShuttleById, { shuttleId });
        return shuttle;
      })
    );

    return shuttles.filter(Boolean);
  }

  static async getHotelLocations(userId: string, hotelId: string) {
    const isAuthorized = await this.verifySuperadmin(userId);
    if (!isAuthorized) {
      throw new Error("Unauthorized: Superadmin access required");
    }

    const hotel = await convex.query(api.hotels.index.getHotelById, { hotelId: hotelId as Id<"hotels"> });
    if (!hotel) return [];

    // Get all locations for this hotel
    const locations = await Promise.all(
      hotel.locationIds.map(async (locationId) => {
        const location = await convex.query(api.locations.index.getLocationById, { locationId });
        return location;
      })
    );

    return locations.filter(Boolean);
  }

  static async getHotelTrips(userId: string, hotelId: string) {
    const isAuthorized = await this.verifySuperadmin(userId);
    if (!isAuthorized) {
      throw new Error("Unauthorized: Superadmin access required");
    }

    const hotel = await convex.query(api.hotels.index.getHotelById, { hotelId: hotelId as Id<"hotels"> });
    if (!hotel) return [];

    // Get all trips for this hotel
    const trips = await Promise.all(
      hotel.tripIds.map(async (tripId) => {
        const trip = await convex.query(api.trips.index.getTripById, { tripId });
        return trip;
      })
    );

    return trips.filter(Boolean);
  }

  static async getHotelBookings(userId: string, hotelId: string) {
    const isAuthorized = await this.verifySuperadmin(userId);
    if (!isAuthorized) {
      throw new Error("Unauthorized: Superadmin access required");
    }

    const hotel = await convex.query(api.hotels.index.getHotelById, { hotelId: hotelId as Id<"hotels"> });
    if (!hotel) return [];

    // Get all bookings for this hotel
    const bookings = await Promise.all(
      hotel.bookingIds.map(async (bookingId) => {
        const booking = await convex.query(api.bookings.index.getBookingById, { bookingId });
        return booking;
      })
    );

    return bookings.filter(Boolean);
  }

  static async listAllHotels(userId: string, limit?: number) {
    const isAuthorized = await this.verifySuperadmin(userId);
    if (!isAuthorized) {
      throw new Error("Unauthorized: Superadmin access required");
    }

    return convex.query(api.superadmin.index.listAllHotels, { limit });
  }

  static async getHotelWithDetails(userId: string, hotelId: string) {
    const isAuthorized = await this.verifySuperadmin(userId);
    if (!isAuthorized) {
      throw new Error("Unauthorized: Superadmin access required");
    }

    return convex.query(api.superadmin.index.getHotelWithDetails, { hotelId: hotelId as Id<"hotels"> });
  }

  static async getUsersByRole(userId: string, hotelId: string, role: string) {
    const isAuthorized = await this.verifySuperadmin(userId);
    if (!isAuthorized) {
      throw new Error("Unauthorized: Superadmin access required");
    }

    return convex.query(api.superadmin.index.getUsersByRole, { 
      hotelId: hotelId as Id<"hotels">, 
      role 
    });
  }

  static async getSystemStats(userId: string) {
    const isAuthorized = await this.verifySuperadmin(userId);
    if (!isAuthorized) {
      throw new Error("Unauthorized: Superadmin access required");
    }

    return convex.query(api.superadmin.index.getSystemStats, {});
  }

  static async updateUserRole(userId: string, targetUserId: string, newRole: "guest" | "admin" | "frontdesk" | "driver" | "superadmin") {
    const isAuthorized = await this.verifySuperadmin(userId);
    if (!isAuthorized) {
      throw new Error("Unauthorized: Superadmin access required");
    }

    return convex.mutation(api.superadmin.index.updateUserRole, {
      userId: targetUserId as Id<"users">,
      newRole,
    })
  }

  static async removeUserFromHotel(userId: string, targetUserId: string, hotelId: string) {
    const isAuthorized = await this.verifySuperadmin(userId);
    if (!isAuthorized) {
      throw new Error("Unauthorized: Superadmin access required");
    }

    return convex.mutation(api.superadmin.index.removeUserFromHotel, {
      userId: targetUserId as Id<"users">,
      hotelId: hotelId as Id<"hotels">,
    });
  }

  static async deactivateHotel(userId: string, hotelId: string) {
    const isAuthorized = await this.verifySuperadmin(userId);
    if (!isAuthorized) {
      throw new Error("Unauthorized: Superadmin access required");
    }

    return convex.mutation(api.superadmin.index.deactivateHotel, {
      hotelId: hotelId as Id<"hotels">,
    });
  }
}

// Type definitions for superadmin components
export type SuperadminHotel = {
  id: string;
  name: string;
  slug: string;
  address: string;
  phoneNumber: string;
  email: string;
  timeZone: string;
  latitude: number;
  longitude: number;
  imageIds: string[];
  shuttleIds: string[];
  userIds: string[];
  locationIds: string[];
  bookingIds: string[];
  tripIds: string[];
};

export type SuperadminUser = {
  _id: string;
  name: string;
  email: string;
  phoneNumber: string;
  role: string;
  hotelId?: string;
  createdAt: number;
};

export type SuperadminShuttle = {
  _id: string;
  name: string;
  licensePlate: string;
  capacity: number;
  hotelId: string;
  driverId?: string;
  status: string;
};

export type SuperadminLocation = {
  _id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  hotelId: string;
  type: string;
};

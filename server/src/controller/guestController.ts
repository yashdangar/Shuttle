import { Request, Response } from "express";
import prisma from "../db/prisma";
import axios from "axios";
import { PaymentMethod, BookingType } from "@prisma/client";
import { generateEncryptionKey, generateQRCode } from "../utils/qrCodeUtils";
import { getSignedUrlFromPath } from "../utils/s3Utils";
import { googleMapsService, type Location } from "../utils/googleMapsUtils";
import { sendToRoleInHotel, sendToUser } from "../ws";
import { WsEvents } from "../ws/events";

const getGuest = (req: Request, res: Response) => {
  res.json({ message: "Guest route" });
};

const getAddressFromCoordinates = async (lat: number, lon: number) => {
  try {
    const response = await axios.get(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`
    );
    return response.data.display_name;
  } catch (error) {
    console.error("Error fetching address:", error);
    return null;
  }
};

const getHotels = async (req: Request, res: Response) => {
  try {
    const hotels = await prisma.hotel.findMany();

    // Convert coordinates to addresses for each hotel
    const hotelsWithAddresses = await Promise.all(
      hotels.map(async (hotel) => {
        const address =
          hotel.latitude && hotel.longitude
            ? await getAddressFromCoordinates(hotel.latitude, hotel.longitude)
            : null;
        return {
          ...hotel,
          address: address || "Address not available",
        };
      })
    );

    res.json({ hotels: hotelsWithAddresses });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch hotels" });
  }
};

const setHotel = async (req: Request, res: Response) => {
  const { hotelId } = req.body;
  const userId = (req as any).user.userId;
  const hotel = await prisma.hotel.findUnique({
    where: { id: hotelId },
  });
  if (!hotel) {
    return res.status(404).json({ error: "Hotel not found" });
  }
  const user = await prisma.guest.findUnique({
    where: { id: userId },
  });
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }
  const guest = await prisma.guest.update({
    where: { id: userId },
    data: { hotelId },
  });
  res.json({ guest });
};

const getHotel = async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;
  const hotel = await prisma.guest.findUnique({
    where: { id: userId },
    include: {
      hotel: true,
    },
  });
  res.json({ hotel });
};

const getLocations = async (req: Request, res: Response) => {
  try {
    const locations = await prisma.location.findMany();
    res.json({ locations });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch locations" });
  }
};

const createTrip = async (req: Request, res: Response) => {
  const {
    numberOfPersons,
    numberOfBags,
    preferredTime,
    paymentMethod,
    tripType,
    pickupLocationId,
    dropoffLocationId,
  } = req.body;
  const userId = (req as any).user.userId;

  try {
    // Generate encryption key
    const encryptionKey = generateEncryptionKey();

    const trip = await prisma.booking.create({
      data: {
        numberOfPersons,
        numberOfBags,
        preferredTime: new Date(preferredTime),
        paymentMethod: paymentMethod as PaymentMethod,
        bookingType:
          tripType === "HOTEL_TO_AIRPORT"
            ? "HOTEL_TO_AIRPORT"
            : "AIRPORT_TO_HOTEL",
        pickupLocationId: pickupLocationId ? parseInt(pickupLocationId) : null,
        dropoffLocationId: dropoffLocationId
          ? parseInt(dropoffLocationId)
          : null,
        guestId: userId,
        encryptionKey,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Get the guest's hotel ID to find available shuttles
    const guest = await prisma.guest.findUnique({
      where: { id: userId },
      select: { hotelId: true },
    });

    if (guest?.hotelId) {
      // Find an available shuttle for this hotel and assign the booking
      const today = new Date();
      const startOfDay = new Date(today);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(today);
      endOfDay.setHours(23, 59, 59, 999);

      const availableShuttle = await prisma.shuttle.findFirst({
        where: {
          hotelId: guest.hotelId,
          schedules: {
            some: {
              scheduleDate: {
                gte: startOfDay,
                lte: endOfDay,
              },
              startTime: { lte: new Date() },
              endTime: { gte: new Date() },
            },
          },
        },
        include: {
          schedules: {
            where: {
              scheduleDate: {
                gte: startOfDay,
                lte: endOfDay,
              },
              startTime: { lte: new Date() },
              endTime: { gte: new Date() },
            },
            include: {
              driver: true,
            },
          },
        },
      });

      if (availableShuttle) {
        // Assign booking to the available shuttle
        await prisma.booking.update({
          where: { id: trip.id },
          data: { shuttleId: availableShuttle.id },
        });

        console.log(
          `Booking ${trip.id} assigned to shuttle ${availableShuttle.vehicleNumber} with driver ${availableShuttle.schedules[0]?.driver?.name}`
        );
      } else {
        console.log(
          `No available shuttle found for hotel ${guest.hotelId}, booking ${trip.id} remains unassigned`
        );
      }
    }

    // Generate QR code
    const qrCodeData = await generateQRCode({
      bookingId: trip.id,
      guestId: trip.guestId,
      preferredTime: trip.preferredTime?.toISOString() || "",
      encryptionKey: trip.encryptionKey!,
    });

    // Update booking with QR code data
    const updatedTrip = await prisma.booking.update({
      where: { id: trip.id },
      data: { qrCodePath: qrCodeData },
    });

    // Send notification to all frontdesks in the hotel
    const guestData = await prisma.guest.findUnique({ where: { id: userId } });
    if (guestData?.hotelId) {
      const notificationPayload = {
        title: "New Booking Created",
        message: `A new booking has been created by ${
          guestData.firstName || "a guest"
        }.`,
        booking: updatedTrip,
      };
      sendToRoleInHotel(
        guestData.hotelId,
        "frontdesk",
        WsEvents.NEW_BOOKING,
        notificationPayload
      );
    }

    res.json({ trip: updatedTrip });
  } catch (error) {
    console.error("Error creating trip:", error);
    res.status(500).json({ error: "Failed to create trip" });
  }
};

const getTrips = async (req: Request, res: Response) => {
  try {
    const guestId = (req as any).user.userId;

    const trips = await prisma.booking.findMany({
      where: {
        guestId: guestId,
      },
      include: {
        pickupLocation: true,
        dropoffLocation: true,
        shuttle: {
          include: {
            schedules: {
              include: {
                driver: {
                  include: {
                    currentLocation: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Add ETA information to each trip
    const tripsWithETA = await Promise.all(
      trips.map(async (trip) => {
        let eta = trip.eta;
        let distance = "Unknown";

        // If we have driver location and destination, calculate ETA
        const driverLocation =
          trip.shuttle?.schedules[0]?.driver?.currentLocation;
        if (driverLocation) {
          let destination: Location | null = null;

          if (trip.bookingType === "HOTEL_TO_AIRPORT") {
            destination = trip.dropoffLocation
              ? {
                  latitude: trip.dropoffLocation.latitude,
                  longitude: trip.dropoffLocation.longitude,
                }
              : null;
          } else {
            destination = trip.pickupLocation
              ? {
                  latitude: trip.pickupLocation.latitude,
                  longitude: trip.pickupLocation.longitude,
                }
              : null;
          }

          if (destination) {
            const origin: Location = {
              latitude: driverLocation.latitude,
              longitude: driverLocation.longitude,
            };

            try {
              const etaResult = await googleMapsService.calculateETA(
                origin,
                destination
              );
              eta = etaResult.duration;
              distance = etaResult.distance;

              // Update the booking with new ETA if it's different
              if (eta !== trip.eta) {
                await prisma.booking.update({
                  where: { id: trip.id },
                  data: {
                    eta: eta,
                    lastEtaUpdate: new Date(),
                  },
                });
              }
            } catch (error) {
              console.error("Error calculating ETA for trip:", trip.id, error);
            }
          }
        }

        return {
          ...trip,
          eta,
          distance,
          driverLocation:
            trip.shuttle?.schedules[0]?.driver?.currentLocation || null,
        };
      })
    );

    res.json({ trips: tripsWithETA });
  } catch (error) {
    console.error("Get trips error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getTrip = async (req: Request, res: Response) => {
  const { id } = req.params;
  const trip = await prisma.booking.findUnique({
    where: { id: id as string },
  });
  res.json({ trip });
};

const getTripQRUrl = async (req: Request, res: Response) => {
  try {
    const tripId = req.params.id;
    const userId = (req as any).user.userId;

    const trip = await prisma.booking.findFirst({
      where: {
        id: tripId,
        guestId: userId,
      },
    });

    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    if (!trip.qrCodePath) {
      return res.status(404).json({ message: "QR code not found" });
    }

    const signedUrl = await getSignedUrlFromPath(trip.qrCodePath);
    res.json({ signedUrl });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

const getSignedUrl = async (req: Request, res: Response) => {
  try {
    const { path } = req.body;
    const userId = (req as any).user.userId;

    if (!path) {
      return res.status(400).json({ message: "Path is required" });
    }

    const tripId = path.split("/")[1];
    if (!tripId) {
      return res.status(400).json({ message: "Invalid path format" });
    }

    const trip = await prisma.booking.findFirst({
      where: {
        id: tripId,
        guestId: userId,
      },
    });

    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    const signedUrl = await getSignedUrlFromPath(path);
    res.json({ signedUrl });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

const getProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;

    // Get guest information with hotel details
    const guest = await prisma.guest.findUnique({
      where: { id: userId },
      include: {
        hotel: true,
        bookings: {
          orderBy: { createdAt: "desc" },
          take: 5, // Get last 5 bookings
          include: {
            pickupLocation: true,
            dropoffLocation: true,
          },
        },
      },
    });

    if (!guest) {
      return res.status(404).json({ error: "Guest not found" });
    }

    // Get booking statistics
    const totalBookings = await prisma.booking.count({
      where: { guestId: userId },
    });

    const completedBookings = await prisma.booking.count({
      where: {
        guestId: userId,
        isCompleted: true,
      },
    });

    const uniqueHotels = await prisma.booking.findMany({
      where: { guestId: userId },
      include: {
        pickupLocation: true,
        dropoffLocation: true,
      },
    });

    // Count unique hotels visited (this is a simplified approach)
    const hotelNames = new Set();
    uniqueHotels.forEach((booking) => {
      if (booking.pickupLocation?.name)
        hotelNames.add(booking.pickupLocation.name);
      if (booking.dropoffLocation?.name)
        hotelNames.add(booking.dropoffLocation.name);
    });

    const profileData = {
      guest: {
        id: guest.id,
        firstName: guest.firstName,
        lastName: guest.lastName,
        email: guest.email,
        phoneNumber: guest.phoneNumber,
        createdAt: guest.createdAt,
        hotel: guest.hotel,
      },
    };

    res.json(profileData);
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
};

const cancelBooking = async (req: Request, res: Response) => {
  const { id } = req.params;
  console.log("Cancel booking request:", { id });
  const { reason } = req.body;
  const guestId = (req as any).user.userId;

  try {
    const booking = await prisma.booking.findUnique({
      where: { id: id },
      include: {
        guest: true,
        trip: {
          include: {
            driver: true,
          },
        },
      },
    });

    if (!booking || booking.guestId !== guestId) {
      return res
        .status(404)
        .json({ error: "Booking not found or access denied" });
    }

    const updatedBooking = await prisma.booking.update({
      where: { id: id },
      data: {
        isCancelled: true,
        cancelledBy: "GUEST",
        cancellationReason: reason,
      },
    });

    // Notify relevant parties
    if (booking.guest.hotelId) {
      const notificationPayload = {
        title: "Booking Cancelled by Guest",
        message: `Booking #${booking.id.substring(0, 8)} for ${
          booking.guest.firstName || "a guest"
        } has been cancelled.`,
        booking: updatedBooking,
      };

      // Notify all frontdesk users at the hotel
      sendToRoleInHotel(
        booking.guest.hotelId,
        "frontdesk",
        WsEvents.BOOKING_CANCELLED,
        notificationPayload
      );

      // Notify the assigned driver, if any
      const driverId = booking.trip?.driverId;
      if (driverId) {
        sendToUser(
          driverId,
          "driver",
          WsEvents.BOOKING_CANCELLED,
          notificationPayload
        );
      }
    }

    res.json({
      message: "Booking cancelled successfully",
      booking: updatedBooking,
    });
  } catch (error) {
    console.error("Error cancelling booking:", error);
    res.status(500).json({ error: "Failed to cancel booking" });
  }
};

const rescheduleBooking = async (req: Request, res: Response) => {
  try {
    const { bookingId } = req.params;
    const { preferredTime } = req.body;
    const userId = (req as any).user.userId;

    console.log("Reschedule request:", { bookingId, preferredTime, userId });

    // Check if booking exists and belongs to the user
    const booking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        guestId: userId,
      },
    });

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    // Check if booking can be rescheduled (not completed, not cancelled)
    if (booking.isCompleted) {
      return res
        .status(400)
        .json({ error: "Cannot reschedule a completed booking" });
    }

    if (booking.isCancelled) {
      return res
        .status(400)
        .json({ error: "Cannot reschedule a cancelled booking" });
    }

    // Validate the new preferred time
    if (!preferredTime) {
      return res.status(400).json({ error: "Preferred time is required" });
    }

    const newPreferredTime = new Date(preferredTime);
    if (isNaN(newPreferredTime.getTime())) {
      return res.status(400).json({ error: "Invalid date format" });
    }

    const now = new Date();
    console.log("Time comparison:", {
      newPreferredTime: newPreferredTime.toISOString(),
      now: now.toISOString(),
      difference: newPreferredTime.getTime() - now.getTime(),
    });

    // Check if the new time is in the future (allow 1 minute buffer)
    const oneMinuteFromNow = new Date(now.getTime() + 60000); // Add 1 minute
    if (newPreferredTime <= oneMinuteFromNow) {
      return res.status(400).json({
        error: "Preferred time must be at least 1 minute in the future",
        newTime: newPreferredTime.toISOString(),
        currentTime: now.toISOString(),
      });
    }

    // Update the booking with new preferred time
    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        preferredTime: newPreferredTime,
        updatedAt: new Date(),
      },
    });

    res.json({
      message: "Booking rescheduled successfully",
      booking: updatedBooking,
    });
  } catch (error) {
    console.error("Error rescheduling booking:", error);
    res.status(500).json({ error: "Failed to reschedule booking" });
  }
};

const getBookingETA = async (req: Request, res: Response) => {
  try {
    const bookingId = req.params.bookingId;
    const guestId = (req as any).user.userId;

    // Get booking details
    const booking = await prisma.booking.findUnique({
      where: {
        id: bookingId,
        guestId: guestId, // Ensure guest can only access their own bookings
      },
      include: {
        guest: true,
        pickupLocation: true,
        dropoffLocation: true,
        shuttle: {
          include: {
            schedules: {
              include: {
                driver: {
                  include: {
                    currentLocation: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Get driver's current location
    const driverLocation =
      booking.shuttle?.schedules[0]?.driver?.currentLocation;

    if (!driverLocation) {
      return res.json({
        eta: "Driver location not available",
        distance: "Unknown",
        driverLocation: null,
        destination: null,
      });
    }

    // Determine destination based on booking type
    let destination: Location | null = null;

    // Always calculate ETA to pickup location (where driver will pick up the guest)
    if (booking.bookingType === "HOTEL_TO_AIRPORT") {
      destination = booking.pickupLocation
        ? {
            latitude: booking.pickupLocation.latitude,
            longitude: booking.pickupLocation.longitude,
          }
        : null;
    } else {
      destination = booking.pickupLocation
        ? {
            latitude: booking.pickupLocation.latitude,
            longitude: booking.pickupLocation.longitude,
          }
        : null;
    }

    if (!destination) {
      return res.json({
        eta: "Destination not available",
        distance: "Unknown",
        driverLocation,
        destination: null,
      });
    }

    // Calculate ETA
    const origin: Location = {
      latitude: driverLocation.latitude,
      longitude: driverLocation.longitude,
    };

    const etaResult = await googleMapsService.calculateETA(origin, destination);

    // Update booking with new ETA
    await prisma.booking.update({
      where: { id: bookingId },
      data: {
        eta: etaResult.duration,
        lastEtaUpdate: new Date(),
      },
    });

    res.json({
      eta: etaResult.duration,
      distance: etaResult.distance,
      driverLocation,
      destination,
      lastUpdate: new Date(),
    });
  } catch (error) {
    console.error("Get booking ETA error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getBookingTracking = async (req: Request, res: Response) => {
  try {
    const bookingId = req.params.bookingId;
    const guestId = (req as any).user.userId;

    // Get booking details
    const booking = await prisma.booking.findUnique({
      where: {
        id: bookingId,
        guestId: guestId, // Ensure guest can only access their own bookings
      },
      include: {
        guest: true,
        pickupLocation: true,
        dropoffLocation: true,
        shuttle: {
          include: {
            schedules: {
              include: {
                driver: {
                  include: {
                    currentLocation: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const driverLocation =
      booking.shuttle?.schedules[0]?.driver?.currentLocation;

    if (!driverLocation) {
      return res.json({
        tracking: {
          driverLocation: null,
          pickupLocation: booking.pickupLocation,
          dropoffLocation: booking.dropoffLocation,
          eta: booking.eta || "Not available",
          status: "Driver location not available",
        },
      });
    }

    // Get directions if Google Maps is available
    let directions = null;
    let destination: Location | null = null;

    // Always calculate directions to pickup location (where driver will pick up the guest)
    if (booking.bookingType === "HOTEL_TO_AIRPORT") {
      destination = booking.pickupLocation
        ? {
            latitude: booking.pickupLocation.latitude,
            longitude: booking.pickupLocation.longitude,
          }
        : null;
    } else {
      destination = booking.pickupLocation
        ? {
            latitude: booking.pickupLocation.latitude,
            longitude: booking.pickupLocation.longitude,
          }
        : null;
    }

    if (destination) {
      const origin: Location = {
        latitude: driverLocation.latitude,
        longitude: driverLocation.longitude,
      };

      directions = await googleMapsService.getDirections(origin, destination);
    }

    res.json({
      tracking: {
        driverLocation,
        pickupLocation: booking.pickupLocation,
        dropoffLocation: booking.dropoffLocation,
        eta: booking.eta || "Calculating...",
        directions,
        status: "Active",
        lastUpdate: driverLocation.timestamp,
      },
    });
  } catch (error) {
    console.error("Get booking tracking error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getCurrentBooking = async (req: Request, res: Response) => {
  try {
    const guestId = (req as any).user.userId;

    // Get the most recent active booking for the guest
    const currentBooking = await prisma.booking.findFirst({
      where: {
        guestId: guestId,
        isCompleted: false, // Only get active bookings
        isCancelled: false, // Exclude cancelled bookings
      },
      include: {
        pickupLocation: true,
        dropoffLocation: true,
        shuttle: {
          include: {
            schedules: {
              include: {
                driver: {
                  include: {
                    currentLocation: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!currentBooking) {
      return res.json({ currentBooking: null });
    }

    // Add ETA information if driver location is available
    let eta = currentBooking.eta;
    let distance = "Unknown";

    const driverLocation =
      currentBooking.shuttle?.schedules[0]?.driver?.currentLocation;
    if (driverLocation) {
      let destination: Location | null = null;

      // Calculate ETA to pickup location (where driver will pick up the guest)
      if (currentBooking.bookingType === "HOTEL_TO_AIRPORT") {
        destination = currentBooking.pickupLocation
          ? {
              latitude: currentBooking.pickupLocation.latitude,
              longitude: currentBooking.pickupLocation.longitude,
            }
          : null;
      } else {
        destination = currentBooking.pickupLocation
          ? {
              latitude: currentBooking.pickupLocation.latitude,
              longitude: currentBooking.pickupLocation.longitude,
            }
          : null;
      }

      if (destination) {
        const origin: Location = {
          latitude: driverLocation.latitude,
          longitude: driverLocation.longitude,
        };

        try {
          const etaResult = await googleMapsService.calculateETA(
            origin,
            destination
          );
          eta = etaResult.duration;
          distance = etaResult.distance;

          // Update the booking with new ETA if it's different
          if (eta !== currentBooking.eta) {
            await prisma.booking.update({
              where: { id: currentBooking.id },
              data: {
                eta: eta,
                lastEtaUpdate: new Date(),
              },
            });
          }
        } catch (error) {
          console.error(
            "Error calculating ETA for current booking:",
            currentBooking.id,
            error
          );
        }
      }
    }

    const bookingWithETA = {
      ...currentBooking,
      eta,
      distance,
      driverLocation: driverLocation || null,
    };

    res.json({ currentBooking: bookingWithETA });
  } catch (error) {
    console.error("Get current booking error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export default {
  getGuest,
  getHotels,
  setHotel,
  getHotel,
  getLocations,
  createTrip,
  getTrips,
  getTrip,
  getTripQRUrl,
  getSignedUrl,
  getProfile,
  cancelBooking,
  rescheduleBooking,
  getBookingETA,
  getBookingTracking,
  getCurrentBooking,
};

import { Request, Response } from "express";
import prisma from "../db/prisma";
import axios from "axios";
import { PaymentMethod, BookingType } from "@prisma/client";
import { generateEncryptionKey, generateQRCode } from "../utils/qrCodeUtils";
import { getSignedUrlFromPath } from "../utils/s3Utils";
import { googleMapsService, type Location } from "../utils/googleMapsUtils";
import { sendToRoleInHotel, sendToUser } from "../ws/index";
import { WsEvents } from "../ws/events";
import { getBookingDataForWebSocket } from "../utils/bookingUtils";

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
    const userId = (req as any).user.userId;
    const guest = await prisma.guest.findUnique({
      where: { id: userId },
      select: { hotelId: true },
    });
    if (!guest?.hotelId) {
      return res.json({ locations: [] });
    }
    const hotelLocations = await prisma.hotelLocation.findMany({
      where: { hotelId: guest.hotelId },
      include: { location: true },
      orderBy: { id: "asc" },
    });
    const locations = hotelLocations.map((hl) => ({
      id: hl.location.id,
      name: hl.location.name,
    }));
    res.json({ locations });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch locations" });
  }
};

const getPricing = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { locationId, numberOfPersons } = req.query;

    if (!locationId || !numberOfPersons) {
      return res.status(400).json({ error: "Location ID and number of persons are required" });
    }

    const guest = await prisma.guest.findUnique({
      where: { id: userId },
      select: { hotelId: true },
    });

    if (!guest?.hotelId) {
      return res.status(400).json({ error: "Guest must be associated with a hotel" });
    }

    const hotelLocation = await prisma.hotelLocation.findUnique({
      where: {
        hotelId_locationId: {
          hotelId: guest.hotelId,
          locationId: parseInt(locationId as string),
        },
      },
    });

    if (!hotelLocation) {
      return res.status(404).json({ error: "Pricing not found for this location" });
    }

    const pricePerPerson = hotelLocation.price;
    const totalPrice = hotelLocation.price * parseInt(numberOfPersons as string);

    res.json({
      pricing: {
        pricePerPerson,
        totalPrice,
        numberOfPersons: parseInt(numberOfPersons as string)
      }
    });
  } catch (error) {
    console.error("Get pricing error:", error);
    res.status(500).json({ error: "Failed to fetch pricing" });
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
    firstName,
    lastName,
    confirmationNum,
    notes,
    isParkSleepFly,
  } = req.body;
  const userId = (req as any).user.userId;

  try {
    // Validation: Either both firstName and lastName OR confirmationNum must be provided
    const hasName = firstName?.trim() && lastName?.trim();
    const hasConfirmation = confirmationNum?.trim();

    if (!hasName && !hasConfirmation) {
      return res.status(400).json({
        error:
          "Please provide either your first name and last name, or your confirmation number",
      });
    }

    // Validation: numberOfPersons must be > 0
    if (!numberOfPersons || numberOfPersons < 1) {
      return res.status(400).json({
        error: "Number of persons must be at least 1"
      });
    }

    // Get guest's hotel for pricing
    const guest = await prisma.guest.findUnique({
      where: { id: userId },
      select: { hotelId: true },
    });

    if (!guest?.hotelId) {
      return res.status(400).json({
        error: "Guest must be associated with a hotel to create a booking",
      });
    }

    // Calculate price based on location and number of persons
    let pricePerPerson = 0;
    let totalPrice = 0;
    let pricingLocationId = null;

    // Determine which location to use for pricing based on booking type
    if (tripType === "HOTEL_TO_AIRPORT") {
      // For hotel to airport, use dropoff location (airport) for pricing
      pricingLocationId = dropoffLocationId ? parseInt(dropoffLocationId) : null;
    } else if (tripType === "AIRPORT_TO_HOTEL") {
      // For airport to hotel, use pickup location (airport) for pricing
      pricingLocationId = pickupLocationId ? parseInt(pickupLocationId) : null;
    }

    if (pricingLocationId) {
      // Get the hotel location price for this location
      const hotelLocation = await prisma.hotelLocation.findUnique({
        where: {
          hotelId_locationId: {
            hotelId: guest.hotelId,
            locationId: pricingLocationId,
          },
        },
      });

      if (hotelLocation) {
        pricePerPerson = hotelLocation.price;
        totalPrice = hotelLocation.price * numberOfPersons;
      }
    }

    // Update guest information if provided
    if (confirmationNum) {
      await prisma.guest.update({
        where: { id: userId },
        data: { confirmationNum },
      });
    }

    // Generate encryption key
    const encryptionKey = generateEncryptionKey();

    const trip = await prisma.booking.create({
      data: {
        numberOfPersons,
        numberOfBags,
        preferredTime: preferredTime ? new Date(preferredTime) : null,
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
        confirmationNum: confirmationNum || null,
        encryptionKey,
        needsFrontdeskVerification: true, // Guest bookings need frontdesk verification
        notes: notes || null,
        // TEMP: Use old field until schema migration is done
        isParkSleepFly: isParkSleepFly || false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // For guest bookings, we don't assign shuttle immediately - wait for frontdesk verification
    // The shuttle assignment will happen after frontdesk verifies the booking

    // For guest bookings, QR code will be generated after frontdesk verification
    // No QR code generation here - it will happen in verifyGuestBooking
    const updatedTrip = trip;

    // Send notification to all frontdesks in the hotel
    const guestData = await prisma.guest.findUnique({ where: { id: userId } });
    if (guestData?.hotelId) {
      // Fetch the complete booking with guest information for the WebSocket event
      const completeBooking = await getBookingDataForWebSocket(
        updatedTrip.id,
        updatedTrip
      );

      const notificationPayload = {
        title: "New Booking Created",
        message: `A new booking has been created by ${
          guestData.firstName || "a guest"
        }.`,
        booking: completeBooking,
      };

      // Send WebSocket notification
      sendToRoleInHotel(
        guestData.hotelId,
        "frontdesk",
        WsEvents.NEW_BOOKING,
        notificationPayload
      );

      // Create database notification for all frontdesk users in the hotel
      const frontdeskUsers = await prisma.frontDesk.findMany({
        where: { hotelId: guestData.hotelId },
      });

      for (const frontdeskUser of frontdeskUsers) {
        await prisma.notification.create({
          data: {
            frontDeskId: frontdeskUser.id,
            title: "New Booking Created",
            message: `A new booking has been created by ${
              guestData.firstName || "a guest"
            }.`,
            isRead: false,
          },
        });
      }
    }

    res.json({ 
      trip: updatedTrip,
      pricing: {
        pricePerPerson,
        totalPrice,
        numberOfPersons
      }
    });
  } catch (error) {
    console.error("Error creating trip:", error);
    res.status(500).json({ error: "Failed to create trip" });
  }
};

const getTrips = async (req: Request, res: Response) => {
  try {
    const guestId = (req as any).user.userId;

    // Get guest's hotel for pricing
    const guest = await prisma.guest.findUnique({
      where: { id: guestId },
      select: { hotelId: true },
    });

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

    // Add ETA and pricing information to each trip
    const tripsWithETA = await Promise.all(
      trips.map(async (trip) => {
        let eta = trip.eta;
        let distance = "Unknown";
        let pricePerPerson = 0;
        let totalPrice = 0;

        // Calculate pricing
        if (guest?.hotelId) {
          let pricingLocationId = null;

          if (trip.bookingType === "HOTEL_TO_AIRPORT") {
            // For hotel to airport, use dropoff location (airport) for pricing
            pricingLocationId = trip.dropoffLocationId;
          } else if (trip.bookingType === "AIRPORT_TO_HOTEL") {
            // For airport to hotel, use pickup location (airport) for pricing
            pricingLocationId = trip.pickupLocationId;
          }

          if (pricingLocationId) {
            // Get the hotel location price for this location
            const hotelLocation = await prisma.hotelLocation.findUnique({
              where: {
                hotelId_locationId: {
                  hotelId: guest.hotelId,
                  locationId: pricingLocationId,
                },
              },
            });

            if (hotelLocation) {
              pricePerPerson = hotelLocation.price;
              totalPrice = hotelLocation.price * trip.numberOfPersons;
            }
          }
        }

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
          pricing: {
            pricePerPerson,
            totalPrice,
            numberOfPersons: trip.numberOfPersons
          }
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

  // Validate that booking ID is provided
  if (!id) {
    return res.status(400).json({ error: "Booking ID is required" });
  }

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

    // Validate that booking ID is provided
    if (!bookingId) {
      return res.status(400).json({ error: "Booking ID is required" });
    }

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
        guest: {
          include: {
            hotel: true,
          },
        },
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

    // Find the first schedule with a driver who has a currentLocation
    const scheduleWithLocation = booking.shuttle?.schedules.find(
      (s) => s.driver?.currentLocation
    );
    const driverLocation = scheduleWithLocation?.driver?.currentLocation;

    if (!driverLocation) {
      // Try to get driver location directly from DriverLocation table as fallback
      if (booking.shuttle?.schedules?.[0]?.driverId) {
        const directLocation = await prisma.driverLocation.findUnique({
          where: { driverId: booking.shuttle.schedules[0].driverId },
        });
      }
      return res.json({
        eta: "Driver location not available",
        distance: "Unknown",
        driverLocation: null,
        destination: null,
      });
    }

    // Determine destination based on booking type
    let destination: Location | null = null;

    // Try pickup location first
    if (booking.pickupLocation) {
      destination = {
        latitude: booking.pickupLocation.latitude,
        longitude: booking.pickupLocation.longitude,
      };
    } else if (
      booking.guest?.hotel?.latitude &&
      booking.guest?.hotel?.longitude
    ) {
      // Fallback: use guest's hotel location
      destination = {
        latitude: booking.guest.hotel.latitude,
        longitude: booking.guest.hotel.longitude,
      };
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
        guest: {
          include: {
            hotel: true,
          },
        },
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

const getCurrentBookings = async (req: Request, res: Response) => {
  try {
    const guestId = (req as any).user.userId;

    // Get guest's hotel for pricing
    const guest = await prisma.guest.findUnique({
      where: { id: guestId },
      select: { hotelId: true },
    });

    // Get all active bookings for the guest
    const currentBookings = await prisma.booking.findMany({
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

    if (!currentBookings || currentBookings.length === 0) {
      return res.json({ currentBookings: [] });
    }

    // Add ETA and pricing information for each booking if driver location is available
    const bookingsWithETA = await Promise.all(
      currentBookings.map(async (currentBooking) => {
        let eta = currentBooking.eta;
        let distance = "Unknown";
        let pricePerPerson = 0;
        let totalPrice = 0;

        // Calculate pricing
        if (guest?.hotelId) {
          let pricingLocationId = null;

          if (currentBooking.bookingType === "HOTEL_TO_AIRPORT") {
            // For hotel to airport, use dropoff location (airport) for pricing
            pricingLocationId = currentBooking.dropoffLocationId;
          } else if (currentBooking.bookingType === "AIRPORT_TO_HOTEL") {
            // For airport to hotel, use pickup location (airport) for pricing
            pricingLocationId = currentBooking.pickupLocationId;
          }

          if (pricingLocationId) {
            // Get the hotel location price for this location
            const hotelLocation = await prisma.hotelLocation.findUnique({
              where: {
                hotelId_locationId: {
                  hotelId: guest.hotelId,
                  locationId: pricingLocationId,
                },
              },
            });

            if (hotelLocation) {
              pricePerPerson = hotelLocation.price;
              totalPrice = hotelLocation.price * currentBooking.numberOfPersons;
            }
          }
        }

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

        return {
          ...currentBooking,
          eta,
          distance,
          driverLocation: driverLocation || null,
          pricing: {
            pricePerPerson,
            totalPrice,
            numberOfPersons: currentBooking.numberOfPersons
          }
        };
      })
    );

    res.json({ currentBookings: bookingsWithETA });
  } catch (error) {
    console.error("Get current bookings error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get guest notifications
const getNotifications = async (req: Request, res: Response) => {
  try {
    const guestId = (req as any).user.userId;
    const { page = 1, limit = 20 } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const notifications = await prisma.notification.findMany({
      where: { guestId },
      orderBy: { createdAt: "desc" },
      skip,
      take: parseInt(limit as string),
    });

    const total = await prisma.notification.count({
      where: { guestId },
    });

    const unreadCount = await prisma.notification.count({
      where: {
        guestId,
        isRead: false,
      },
    });

    res.json({
      notifications,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string)),
      },
      unreadCount,
    });
  } catch (error) {
    console.error("Get notifications error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Mark notification as read
const markNotificationAsRead = async (req: Request, res: Response) => {
  try {
    const { notificationId } = req.params;
    const guestId = (req as any).user.userId;

    const notification = await prisma.notification.findFirst({
      where: {
        id: parseInt(notificationId),
        guestId,
      },
    });

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    await prisma.notification.update({
      where: { id: parseInt(notificationId) },
      data: { isRead: true },
    });

    res.json({ message: "Notification marked as read" });
  } catch (error) {
    console.error("Mark notification as read error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Mark all notifications as read
const markAllNotificationsAsRead = async (req: Request, res: Response) => {
  try {
    const guestId = (req as any).user.userId;

    await prisma.notification.updateMany({
      where: {
        guestId,
        isRead: false,
      },
      data: { isRead: true },
    });

    res.json({ message: "All notifications marked as read" });
  } catch (error) {
    console.error("Mark all notifications as read error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Delete notification
const deleteNotification = async (req: Request, res: Response) => {
  try {
    const { notificationId } = req.params;
    const guestId = (req as any).user.userId;

    const notification = await prisma.notification.findFirst({
      where: {
        id: parseInt(notificationId),
        guestId,
      },
    });

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    await prisma.notification.delete({
      where: { id: parseInt(notificationId) },
    });

    res.json({ message: "Notification deleted" });
  } catch (error) {
    console.error("Delete notification error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export default {
  getGuest,
  getHotels,
  setHotel,
  getHotel,
  getLocations,
  getPricing,
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
  getCurrentBookings,
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
};

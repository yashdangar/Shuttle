import { Request, Response } from "express";
import prisma from "../db/prisma";
import axios from "axios";
import { PaymentMethod, BookingType } from "@prisma/client";
import { generateEncryptionKey, generateQRCode } from "../utils/qrCodeUtils";
import { getSignedUrlFromPath } from "../utils/s3Utils";

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
        bookingType: tripType === "HOTEL_TO_AIRPORT" ? "HOTEL_TO_AIRPORT" : "AIRPORT_TO_HOTEL",
        pickupLocationId: pickupLocationId ? parseInt(pickupLocationId) : null,
        dropoffLocationId: dropoffLocationId ? parseInt(dropoffLocationId) : null,
        guestId: userId,
        encryptionKey,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Generate QR code
    const qrCodeData = await generateQRCode({
      bookingId: trip.id,
      guestId: trip.guestId,
      preferredTime: trip.preferredTime?.toISOString() || '',
      encryptionKey: trip.encryptionKey!,
    });

    // Update booking with QR code data
    const updatedTrip = await prisma.booking.update({
      where: { id: trip.id },
      data: { qrCodePath: qrCodeData },
    });

    res.json({ trip: updatedTrip });
  } catch (error) {
    console.error("Error creating trip:", error);
    res.status(500).json({ error: "Failed to create trip" });
  }
};

const getTrips = async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;
  const trips = await prisma.booking.findMany({
    where: { guestId: userId },   
  });
  res.json({ trips });
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

    const tripId = path.split('/')[1];
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

export default { getGuest, getHotels, setHotel, getHotel, getLocations, createTrip, getTrips, getTrip, getTripQRUrl, getSignedUrl };
